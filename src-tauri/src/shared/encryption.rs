use crate::shared::error::AppError;

const PBKDF2_ITERATIONS: u32 = 600_000;
const NONCE_SIZE: usize = 12;

pub fn derive_key(master_password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<sha2::Sha256>(
        master_password.as_bytes(),
        salt,
        PBKDF2_ITERATIONS,
        &mut key,
    );
    key
}

pub fn encrypt_config(plaintext: &str, master_password: &str) -> Result<String, AppError> {
    use aes_gcm::{
        aead::{Aead, KeyInit, OsRng},
        Aes256Gcm, Nonce,
    };
    use rand_core::RngCore;

    let salt = {
        let mut buf = [0u8; 32];
        OsRng.fill_bytes(&mut buf);
        buf
    };
    let key = derive_key(master_password, &salt);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|_| AppError::InternalError("Error al inicializar cifrado.".to_string()))?;

    let mut nonce_bytes = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|_| AppError::InternalError("Error al cifrar configuracion.".to_string()))?;

    let mut output: Vec<u8> = Vec::with_capacity(32 + 12 + ciphertext.len());
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(hex::encode(output))
}
