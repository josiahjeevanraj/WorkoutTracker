#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MotionVideoWriter, NSObject)

RCT_EXTERN_METHOD(start:(NSString *)path width:(nonnull NSNumber *)width height:(nonnull NSNumber *)height fps:(nonnull NSNumber *)fps
                  resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(appendFrame:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(finish:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
