export type Unarray<T extends object> = T extends Array<infer U> ? U : T;
