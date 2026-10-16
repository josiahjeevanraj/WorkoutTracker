#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RouteVideoRenderer, NSObject)

RCT_EXTERN_METHOD(render:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
