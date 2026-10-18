//! Map and set types used across the crate.
//!
//! `std::collections::HashMap` iterates in an order that depends on its random
//! hash keys. On wasm32 those keys change every time a new map is created in
//! the same module instance, so iterating the same data gave a different
//! order on every analysis run in a reused instance (worker or main thread):
//! row order changed, and for designs with several measures values were
//! paired with the wrong measure. These aliases keep insertion order
//! (definition order of variables, factors and measures), which makes every
//! result deterministic and matches SPSS's ordering.
pub type HashMap<K, V> = indexmap::IndexMap<K, V>;
pub type HashSet<T> = indexmap::IndexSet<T>;
