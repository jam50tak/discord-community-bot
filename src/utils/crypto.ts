import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  public static generateKey(): string {
    return randomBytes(this.KEY_LENGTH).toString('hex');
  }

  public static hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  public static encrypt(data: string, key: string): string {
    try {
      const keyBuffer = Buffer.from(key.slice(0, 64), 'hex');
      const iv = randomBytes(this.IV_LENGTH);

      const cipher = createCipheriv(this.ALGORITHM, keyBuffer, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine iv + tag + encrypted data
      return iv.toString('hex') + tag.toString('hex') + encrypted;
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  public static decrypt(encryptedData: string, key: string): string {
    try {
      const keyBuffer = Buffer.from(key.slice(0, 64), 'hex');

      // Extract iv, tag, and encrypted data
      const iv = Buffer.from(encryptedData.slice(0, this.IV_LENGTH * 2), 'hex');
      const tag = Buffer.from(encryptedData.slice(this.IV_LENGTH * 2, (this.IV_LENGTH + this.TAG_LENGTH) * 2), 'hex');
      const encrypted = encryptedData.slice((this.IV_LENGTH + this.TAG_LENGTH) * 2);

      const decipher = createDecipheriv(this.ALGORITHM, keyBuffer, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  public static generateEncryptionKey(): string {
    return this.generateKey();
  }

  public static isValidKey(key: string): boolean {
    try {
      return key.length === this.KEY_LENGTH * 2 && /^[0-9a-f]+$/i.test(key);
    } catch {
      return false;
    }
  }
}

export const cryptoUtils = CryptoUtils;