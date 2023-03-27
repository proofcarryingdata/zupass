export type Unarray<T> = T extends Array<infer U> ? U : T;
