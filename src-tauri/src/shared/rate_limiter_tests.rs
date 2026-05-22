#[cfg(test)]
mod tests {
    use crate::shared::state::LoginRateLimiter;

    #[tokio::test]
    async fn test_rate_limiter_allows_first_five_attempts() {
        let limiter = LoginRateLimiter::new();
        let key = "testuser";

        for _ in 0..5 {
            assert!(limiter.check_and_record(key).await.is_ok());
        }
    }

    #[tokio::test]
    async fn test_rate_limiter_blocks_sixth_attempt() {
        let limiter = LoginRateLimiter::new();
        let key = "blocked_user";

        for _ in 0..5 {
            limiter.check_and_record(key).await.unwrap();
        }

        let sixth = limiter.check_and_record(key).await;
        assert!(sixth.is_err());
        assert!(sixth
            .unwrap_err()
            .to_string()
            .contains("Demasiados intentos"));
    }

    #[tokio::test]
    async fn test_rate_limiter_clears_after_success() {
        let limiter = LoginRateLimiter::new();
        let key = "clear_test";

        for _ in 0..5 {
            limiter.check_and_record(key).await.unwrap();
        }

        limiter.clear(key).await;

        assert!(limiter.check_and_record(key).await.is_ok());
    }

    #[tokio::test]
    async fn test_rate_limiter_independent_per_user() {
        let limiter = LoginRateLimiter::new();

        for _ in 0..5 {
            limiter.check_and_record("user_a").await.unwrap();
        }

        assert!(limiter.check_and_record("user_b").await.is_ok());
        assert!(limiter.check_and_record("user_a").await.is_err());
    }
}
