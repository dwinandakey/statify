use rand_mt::Mt;

pub fn seeded_mt19937(seed: Option<i64>) -> Mt {
    let seed = seed.map(|seed| seed as u32).unwrap_or_else(rand::random);
    Mt::new(seed)
}

pub fn random_interval(rng: &mut Mt, max: usize) -> usize {
    if max == 0 {
        return 0;
    }

    let mut mask = max;
    mask |= mask >> 1;
    mask |= mask >> 2;
    mask |= mask >> 4;
    mask |= mask >> 8;
    mask |= mask >> 16;

    if usize::BITS > 32 {
        mask |= mask >> 32;
    }

    loop {
        #[cfg(target_pointer_width = "64")]
        let value = if max <= u32::MAX as usize {
            rng.next_u32() as usize
        } else {
            ((rng.next_u32() as usize) << 32) | rng.next_u32() as usize
        } & mask;

        #[cfg(not(target_pointer_width = "64"))]
        let value = rng.next_u32() as usize & mask;

        if value <= max {
            return value;
        }
    }
}

pub fn shuffle_indices_numpy_compatible(indices: &mut [usize], seed: Option<i64>) {
    let mut rng = seeded_mt19937(seed);
    shuffle_indices_numpy_compatible_with_rng(indices, &mut rng);
}

pub fn shuffle_indices_numpy_compatible_with_rng(indices: &mut [usize], rng: &mut Mt) {
    for i in (1..indices.len()).rev() {
        let j = random_interval(rng, i);
        indices.swap(i, j);
    }
}

#[cfg(test)]
mod tests {
    use super::shuffle_indices_numpy_compatible;

    #[test]
    fn shuffle_matches_numpy_random_state_permutation() {
        let mut indices: Vec<usize> = (0..10).collect();

        shuffle_indices_numpy_compatible(&mut indices, Some(1234));

        assert_eq!(indices, vec![7, 2, 9, 1, 0, 8, 4, 5, 6, 3]);
    }
}
