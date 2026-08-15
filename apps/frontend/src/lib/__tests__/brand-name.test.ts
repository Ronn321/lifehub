import { describe, it, expect } from 'vitest';
import { DEFAULT_APP_NAME, readBrandName } from '../brand';

describe('DEFAULT_APP_NAME', () => {
  it('lautet standardmäßig LifeHub', () => {
    expect(DEFAULT_APP_NAME).toBe('LifeHub');
  });
});

describe('readBrandName', () => {
  it('liefert den Default bei fehlenden Settings', () => {
    expect(readBrandName(undefined)).toBe('LifeHub');
    expect(readBrandName(null)).toBe('LifeHub');
  });

  it('liefert den Default bei leeren Settings', () => {
    expect(readBrandName({})).toBe('LifeHub');
  });

  it('liefert den konfigurierten Anwendungsnamen', () => {
    expect(readBrandName({ 'general.brand_name': 'MeinHub' })).toBe('MeinHub');
  });

  it('trimmt den konfigurierten Namen', () => {
    expect(readBrandName({ 'general.brand_name': '  MeinHub  ' })).toBe('MeinHub');
  });

  it('fällt auf den Default zurück bei leerem/Whitespace-Namen', () => {
    expect(readBrandName({ 'general.brand_name': '' })).toBe('LifeHub');
    expect(readBrandName({ 'general.brand_name': '   ' })).toBe('LifeHub');
  });

  it('fällt auf den Default zurück bei Nicht-String-Wert', () => {
    expect(readBrandName({ 'general.brand_name': 42 })).toBe('LifeHub');
    expect(readBrandName({ 'general.brand_name': null })).toBe('LifeHub');
  });

  it('ignoriert andere Settings-Keys', () => {
    expect(readBrandName({ 'general.timezone': 'Europe/Berlin' })).toBe('LifeHub');
  });
});