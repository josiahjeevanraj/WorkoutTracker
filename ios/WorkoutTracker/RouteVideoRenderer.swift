import Foundation
import AVFoundation
import UIKit
import React

// Renders the outdoor-run share video natively: each frame is drawn with
// Core Graphics/UIKit straight into a pixel buffer and encoded to H.264 with
// AVAssetWriter. No screenshots or per-frame JS, so it's fast and smooth.
//
// render(options) -> file URL. Options (sizes in output pixels):
//   width, height, fps, drawMs, holdMs, mapPath (optional image),
//   points [[x, y, segment], ...], kicker, title, date, attribution,
//   distance (number), unit, durationSec, pace (string), accent, green (hex)
@objc(RouteVideoRenderer)
class RouteVideoRenderer: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  private let queue = DispatchQueue(label: "motion.routevideo", qos: .userInitiated)

  @objc(render:resolver:rejecter:)
  func render(_ options: NSDictionary,
              resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    queue.async {
      do {
        let url = try self.renderVideo(options)
        resolve(url.absoluteString)
      } catch {
        reject("render_failed", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Rendering

  private struct Pt { let x: CGFloat; let y: CGFloat; let seg: Int }

  private func renderVideo(_ o: NSDictionary) throws -> URL {
    let W = CGFloat((o["width"] as? NSNumber)?.intValue ?? 1080) // H.264 wants even sizes
    let H = CGFloat((o["height"] as? NSNumber)?.intValue ?? 1920)
    let size = CGSize(width: Int(W) & ~1, height: Int(H) & ~1)
    let fps = Int32((o["fps"] as? NSNumber)?.intValue ?? 30)
    let drawMs = (o["drawMs"] as? NSNumber)?.doubleValue ?? 12000
    let holdMs = (o["holdMs"] as? NSNumber)?.doubleValue ?? 2500
    let accent = color(o["accent"] as? String ?? "#22D3EE")
    let green = color(o["green"] as? String ?? "#34D399")
    let pts: [Pt] = ((o["points"] as? [[NSNumber]]) ?? []).compactMap {
      $0.count >= 2 ? Pt(x: CGFloat($0[0].doubleValue), y: CGFloat($0[1].doubleValue), seg: $0.count > 2 ? $0[2].intValue : 0) : nil
    }
    let distance = (o["distance"] as? NSNumber)?.doubleValue ?? 0
    let unit = o["unit"] as? String ?? "km"
    let durationSec = (o["durationSec"] as? NSNumber)?.doubleValue ?? 0
    let pace = o["pace"] as? String ?? "—"

    // Cumulative drawn length, so the head moves at a steady speed
    var cum: [CGFloat] = [0]
    for i in 1..<max(pts.count, 1) {
      let same = pts[i].seg == pts[i - 1].seg
      cum.append(cum[i - 1] + (same ? hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) : 0))
    }
    let totalLen = cum.last ?? 0

    let background = drawBackground(size: size, options: o, accent: accent, green: green, pts: pts)

    // Writer
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("motion-run-\(Int(Date().timeIntervalSince1970)).mp4")
    try? FileManager.default.removeItem(at: url)
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: Int(size.width),
      AVVideoHeightKey: Int(size.height),
      AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 8_000_000, AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2],
    ])
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferWidthKey as String: Int(size.width),
      kCVPixelBufferHeightKey as String: Int(size.height),
    ])
    writer.add(input)
    guard writer.startWriting() else { throw writer.error ?? NSError(domain: "RouteVideoRenderer", code: 1) }
    writer.startSession(atSourceTime: .zero)

    let totalFrames = Int(((drawMs + holdMs) / 1000) * Double(fps))
    for i in 0..<totalFrames {
      let ms = Double(i) * 1000 / Double(fps)
      let p = min(1, ms / drawMs)
      let eased = CGFloat(0.5 - cos(p * .pi) / 2) // ease in-out
      let footerAlpha = CGFloat(min(1, max(0, (ms - drawMs) / 500)))

      guard let pool = adaptor.pixelBufferPool else { throw NSError(domain: "RouteVideoRenderer", code: 2) }
      var buf: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buf)
      guard let pixelBuffer = buf else { throw NSError(domain: "RouteVideoRenderer", code: 3) }
      CVPixelBufferLockBaseAddress(pixelBuffer, [])
      if let ctx = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer), width: Int(size.width), height: Int(size.height),
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer), space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) {
        // UIKit-style coordinates (origin top-left)
        ctx.translateBy(x: 0, y: size.height)
        ctx.scaleBy(x: 1, y: -1)
        UIGraphicsPushContext(ctx)
        background.draw(in: CGRect(origin: .zero, size: size))
        let head = drawRoute(ctx, pts: pts, cum: cum, upTo: eased * totalLen, accent: accent)
        if let h = head { drawDot(ctx, at: h, radius: 16, fill: accent) }
        drawStats(size: size, progress: eased, distance: distance, unit: unit, durationSec: durationSec, pace: pace)
        drawFooter(ctx, size: size, alpha: footerAlpha, accent: accent)
        UIGraphicsPopContext()
      }
      CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
      while !input.isReadyForMoreMediaData { usleep(1000) }
      if !adaptor.append(pixelBuffer, withPresentationTime: CMTime(value: Int64(i), timescale: fps)) {
        throw writer.error ?? NSError(domain: "RouteVideoRenderer", code: 4)
      }
    }

    input.markAsFinished()
    let done = DispatchSemaphore(value: 0)
    writer.finishWriting { done.signal() }
    done.wait()
    guard writer.status == .completed else { throw writer.error ?? NSError(domain: "RouteVideoRenderer", code: 5) }
    return url
  }

  // Map, darkening gradients, title block and start dot: drawn once per video
  private func drawBackground(size: CGSize, options o: NSDictionary, accent: UIColor, green: UIColor, pts: [Pt]) -> UIImage {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    return UIGraphicsImageRenderer(size: size, format: format).image { rc in
      let ctx = rc.cgContext
      UIColor(red: 14 / 255, green: 14 / 255, blue: 14 / 255, alpha: 1).setFill()
      ctx.fill(CGRect(origin: .zero, size: size))
      if let path = o["mapPath"] as? String, let map = UIImage(contentsOfFile: Self.filePath(path)) {
        map.draw(in: CGRect(origin: .zero, size: size))
      }
      let space = CGColorSpaceCreateDeviceRGB()
      let dark = { (a: CGFloat) in UIColor(red: 14 / 255, green: 14 / 255, blue: 14 / 255, alpha: a).cgColor }
      if let top = CGGradient(colorsSpace: space, colors: [dark(0.95), dark(0)] as CFArray, locations: [0, 1]) {
        ctx.drawLinearGradient(top, start: .zero, end: CGPoint(x: 0, y: 520), options: [])
      }
      if let bottom = CGGradient(colorsSpace: space, colors: [dark(0), dark(0.92), dark(1)] as CFArray, locations: [0, 0.35, 1]) {
        ctx.drawLinearGradient(bottom, start: CGPoint(x: 0, y: size.height - 760), end: CGPoint(x: 0, y: size.height), options: [.drawsAfterEndLocation])
      }
      self.text(o["kicker"] as? String ?? "OUTDOOR RUN", at: CGPoint(x: 96, y: 260), size: 36, weight: .heavy, color: accent)
      self.text(o["title"] as? String ?? "Outdoor Run", at: CGPoint(x: 96, y: 312), size: 84, weight: .heavy, color: .white, maxWidth: size.width - 192)
      self.text(o["date"] as? String ?? "", at: CGPoint(x: 96, y: 418), size: 36, weight: .medium, color: UIColor(white: 0.72, alpha: 1))
      if let attribution = o["attribution"] as? String {
        self.text(attribution, at: CGPoint(x: 96, y: size.height - 110), size: 24, weight: .medium, color: UIColor(white: 1, alpha: 0.45))
      }
      if let start = pts.first { self.drawDot(ctx, at: CGPoint(x: start.x, y: start.y), radius: 12, fill: green) }
    }
  }

  // Route up to `upTo` drawn length; returns the head position
  private func drawRoute(_ ctx: CGContext, pts: [Pt], cum: [CGFloat], upTo: CGFloat, accent: UIColor) -> CGPoint? {
    guard pts.count > 1 else { return pts.first.map { CGPoint(x: $0.x, y: $0.y) } }
    let path = CGMutablePath()
    var head = CGPoint(x: pts[0].x, y: pts[0].y)
    path.move(to: head)
    for i in 1..<pts.count {
      let a = pts[i - 1], b = pts[i]
      if b.seg != a.seg { path.move(to: CGPoint(x: b.x, y: b.y)); head = CGPoint(x: b.x, y: b.y); continue }
      if cum[i] <= upTo {
        head = CGPoint(x: b.x, y: b.y)
        path.addLine(to: head)
      } else {
        let len = cum[i] - cum[i - 1]
        let f = len > 0 ? (upTo - cum[i - 1]) / len : 0
        head = CGPoint(x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f)
        path.addLine(to: head)
        break
      }
    }
    ctx.saveGState()
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    ctx.addPath(path)
    ctx.setShadow(offset: .zero, blur: 24, color: accent.cgColor)
    ctx.setStrokeColor(accent.cgColor)
    ctx.setLineWidth(12)
    ctx.strokePath()
    ctx.setShadow(offset: .zero, blur: 0, color: nil)
    ctx.addPath(path)
    ctx.setStrokeColor(UIColor(white: 1, alpha: 0.85).cgColor)
    ctx.setLineWidth(5.4)
    ctx.strokePath()
    ctx.restoreGState()
    return head
  }

  private func drawDot(_ ctx: CGContext, at p: CGPoint, radius r: CGFloat, fill: UIColor) {
    let rect = CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2)
    ctx.setFillColor(fill.cgColor)
    ctx.fillEllipse(in: rect)
    ctx.setStrokeColor(UIColor.white.cgColor)
    ctx.setLineWidth(r * 0.4)
    ctx.strokeEllipse(in: rect)
  }

  private func drawStats(size: CGSize, progress: CGFloat, distance: Double, unit: String, durationSec: Double, pace: String) {
    let items = [
      ("DISTANCE", String(format: "%.2f %@", distance * Double(progress), unit)),
      ("TIME", Self.duration(durationSec * Double(progress))),
      ("PACE", pace),
    ]
    let colW = (size.width - 192) / 3
    for (i, item) in items.enumerated() {
      let x = 96 + colW * CGFloat(i)
      text(item.0, at: CGPoint(x: x, y: size.height - 520), size: 30, weight: .bold, color: UIColor(white: 0.72, alpha: 1))
      text(item.1, at: CGPoint(x: x, y: size.height - 470), size: 72, weight: .heavy, color: .white, maxWidth: colW - 12)
    }
  }

  private func drawFooter(_ ctx: CGContext, size: CGSize, alpha: CGFloat, accent: UIColor) {
    guard alpha > 0 else { return }
    ctx.setFillColor(accent.withAlphaComponent(alpha).cgColor)
    ctx.fill(CGRect(x: 96, y: size.height - 330, width: 110, height: 10))
    text("Logged with Motion", at: CGPoint(x: 96, y: size.height - 300), size: 36, weight: .semibold, color: UIColor(white: 0.72, alpha: alpha))
  }

  // Single-line text, shrunk to fit maxWidth if needed
  private func text(_ s: String, at p: CGPoint, size: CGFloat, weight: UIFont.Weight, color: UIColor, maxWidth: CGFloat? = nil) {
    var fontSize = size
    var attrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: fontSize, weight: weight), .foregroundColor: color]
    if let maxW = maxWidth {
      while (s as NSString).size(withAttributes: attrs).width > maxW && fontSize > size * 0.5 {
        fontSize -= 2
        attrs[.font] = UIFont.systemFont(ofSize: fontSize, weight: weight)
      }
    }
    (s as NSString).draw(at: p, withAttributes: attrs)
  }

  private static func duration(_ seconds: Double) -> String {
    let s = Int(seconds.rounded())
    return s >= 3600 ? String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60) : String(format: "%d:%02d", s / 60, s % 60)
  }

  private static func filePath(_ path: String) -> String {
    path.hasPrefix("file://") ? (URL(string: path)?.path ?? path) : path
  }

  private func color(_ hex: String) -> UIColor {
    var v: UInt64 = 0
    Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    return UIColor(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: 1)
  }
}
