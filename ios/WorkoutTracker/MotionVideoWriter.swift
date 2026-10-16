import Foundation
import AVFoundation
import UIKit
import React

// Writes still frames (image files) into an H.264 MP4 with AVAssetWriter.
// Used to make the run-route animation for sharing: JS renders each frame,
// snapshots it to a file, and appends it here.
@objc(MotionVideoWriter)
class MotionVideoWriter: NSObject {

  private var writer: AVAssetWriter?
  private var input: AVAssetWriterInput?
  private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var frameIndex: Int64 = 0
  private var fps: Int32 = 24
  private var size = CGSize.zero
  private var outputURL: URL?
  private let queue = DispatchQueue(label: "motion.videowriter")

  @objc static func requiresMainQueueSetup() -> Bool { false }

  private static func fileURL(_ path: String) -> URL {
    path.hasPrefix("file://") ? URL(string: path)! : URL(fileURLWithPath: path)
  }

  @objc(start:width:height:fps:resolver:rejecter:)
  func start(_ path: String, width: NSNumber, height: NSNumber, fps: NSNumber,
             resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    queue.async {
      do {
        let url = Self.fileURL(path)
        try? FileManager.default.removeItem(at: url)
        // H.264 needs even dimensions
        let w = width.intValue & ~1, h = height.intValue & ~1
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
          AVVideoCodecKey: AVVideoCodecType.h264,
          AVVideoWidthKey: w,
          AVVideoHeightKey: h,
          AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 6_000_000],
        ])
        input.expectsMediaDataInRealTime = false
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
          kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
          kCVPixelBufferWidthKey as String: w,
          kCVPixelBufferHeightKey as String: h,
        ])
        guard writer.canAdd(input) else { throw NSError(domain: "MotionVideoWriter", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot add video input"]) }
        writer.add(input)
        guard writer.startWriting() else { throw writer.error ?? NSError(domain: "MotionVideoWriter", code: 2) }
        writer.startSession(atSourceTime: .zero)
        self.writer = writer; self.input = input; self.adaptor = adaptor
        self.frameIndex = 0; self.fps = fps.int32Value; self.size = CGSize(width: w, height: h); self.outputURL = url
        resolve(url.absoluteString)
      } catch {
        reject("start_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(appendFrame:resolver:rejecter:)
  func appendFrame(_ imagePath: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    queue.async {
      guard let adaptor = self.adaptor, let input = self.input,
            let image = UIImage(contentsOfFile: Self.fileURL(imagePath).path)?.cgImage,
            let pool = adaptor.pixelBufferPool else {
        reject("append_failed", "Writer not started or frame unreadable", nil); return
      }
      var buffer: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
      guard let pixelBuffer = buffer else { reject("append_failed", "No pixel buffer", nil); return }
      CVPixelBufferLockBaseAddress(pixelBuffer, [])
      let ctx = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: Int(self.size.width), height: Int(self.size.height), bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer), space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
      ctx?.draw(image, in: CGRect(origin: .zero, size: self.size))
      CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
      while !input.isReadyForMoreMediaData { usleep(2000) }
      let time = CMTime(value: self.frameIndex, timescale: self.fps)
      if adaptor.append(pixelBuffer, withPresentationTime: time) {
        self.frameIndex += 1
        resolve(nil)
      } else {
        reject("append_failed", self.writer?.error?.localizedDescription ?? "Append failed", self.writer?.error)
      }
    }
  }

  @objc(finish:rejecter:)
  func finish(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    queue.async {
      guard let writer = self.writer, let input = self.input else { reject("finish_failed", "Writer not started", nil); return }
      input.markAsFinished()
      writer.finishWriting {
        if writer.status == .completed { resolve(self.outputURL?.absoluteString) }
        else { reject("finish_failed", writer.error?.localizedDescription ?? "Finish failed", writer.error) }
        self.writer = nil; self.input = nil; self.adaptor = nil
      }
    }
  }
}
