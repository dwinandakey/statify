// Suppress clippy warnings globally - these are style warnings that don't affect functionality
#![allow(clippy::needless_return)]
#![allow(clippy::excessive_precision)]
#![allow(clippy::needless_range_loop)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::manual_clamp)]
#![allow(clippy::let_and_return)]
#![allow(clippy::nonminimal_bool)]
#![allow(clippy::collapsible_if)]
#![allow(clippy::collapsible_else_if)]
#![allow(clippy::ptr_arg)]
#![allow(clippy::if_same_then_else)]
#![allow(clippy::assign_op_pattern)]
#![allow(clippy::unwrap_or_default)]
#![allow(clippy::unnecessary_map_or)]

pub mod models;
pub mod stats;
pub mod utils;
pub mod wasm;

#[cfg(test)]
pub mod test;