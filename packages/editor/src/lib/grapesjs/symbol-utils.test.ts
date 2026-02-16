import { describe, it, expect, vi } from 'vitest';
import {
  isNativeSymbolData,
  getSymbolInfo,
  findMainByGrapesId,
  serializeMainSymbol,
} from './symbol-utils';

// ── isNativeSymbolData ──────────────────────────────────────────

describe('isNativeSymbolData', () => {
  it('returns true for data with tagName at top level', () => {
    expect(isNativeSymbolData({ tagName: 'div', attributes: {} })).toBe(true);
  });

  it('returns true for data with type at top level', () => {
    expect(isNativeSymbolData({ type: 'default', components: [] })).toBe(true);
  });

  it('returns false for legacy wrapper format with components, id, and label', () => {
    expect(
      isNativeSymbolData({
        id: 'symbol-123',
        label: 'My Symbol',
        components: [{ tagName: 'div' }],
      })
    ).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNativeSymbolData(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNativeSymbolData(undefined)).toBe(false);
  });

  it('returns false for non-object primitives', () => {
    expect(isNativeSymbolData('string')).toBe(false);
    expect(isNativeSymbolData(42)).toBe(false);
    expect(isNativeSymbolData(true)).toBe(false);
  });

  it('returns false for empty object (no tagName, no type, no components wrapper)', () => {
    expect(isNativeSymbolData({})).toBe(false);
  });

  it('returns true for object with components array but no id/label (plain div with children)', () => {
    // GrapesJS omits tagName for plain <div>; this IS a native component
    expect(isNativeSymbolData({ components: [{ tagName: 'div' }] })).toBe(true);
  });

  it('returns true for native data that also has components (child components)', () => {
    // Native symbols from toJSON() can have both tagName and components
    expect(
      isNativeSymbolData({
        tagName: 'usa-button',
        type: 'default',
        components: [{ tagName: 'span', content: 'Click' }],
      })
    ).toBe(true);
  });

  it('returns true for data with __symbol marker (native GrapesJS symbol)', () => {
    expect(isNativeSymbolData({ __symbol: true })).toBe(true);
  });

  it('returns true for data with __symbolId marker', () => {
    expect(isNativeSymbolData({ __symbolId: 'abc-123' })).toBe(true);
  });

  it('returns true for data with attributes but no tagName (plain div)', () => {
    // GrapesJS serializes plain divs without tagName but with attributes
    expect(isNativeSymbolData({ attributes: { class: 'my-class' } })).toBe(true);
  });

  it('returns true for data with classes but no tagName (plain div)', () => {
    expect(isNativeSymbolData({ classes: ['container'] })).toBe(true);
  });

  it('returns true for plain div with components and attributes but no tagName', () => {
    // Common case: user selects a div container with children
    expect(
      isNativeSymbolData({
        attributes: { id: 'wrapper' },
        components: [{ tagName: 'usa-button' }, { tagName: 'usa-alert' }],
      })
    ).toBe(true);
  });

  it('returns true for object with id and components but no label (not legacy envelope)', () => {
    // Has id + components but missing label → NOT legacy wrapper format → native
    expect(
      isNativeSymbolData({
        id: 'some-component-id',
        components: [{ tagName: 'div' }],
      })
    ).toBe(true);
  });
});

// ── getSymbolInfo ──────────────────────────────────────────────

describe('getSymbolInfo', () => {
  it('returns symbol info when editor API is available', () => {
    const mockInfo = {
      isSymbol: true,
      isMain: false,
      isInstance: true,
      isRoot: true,
      main: {},
      instances: [],
      relatives: [],
    };
    const editor = {
      Components: {
        getSymbolInfo: vi.fn().mockReturnValue(mockInfo),
      },
    };
    const component = {};
    expect(getSymbolInfo(editor, component)).toEqual(mockInfo);
    expect(editor.Components.getSymbolInfo).toHaveBeenCalledWith(component);
  });

  it('returns null when editor is null', () => {
    expect(getSymbolInfo(null, {})).toBeNull();
  });

  it('returns null when Components is undefined', () => {
    expect(getSymbolInfo({}, {})).toBeNull();
  });

  it('returns null when getSymbolInfo is not a function', () => {
    expect(getSymbolInfo({ Components: {} }, {})).toBeNull();
  });

  it('returns null when getSymbolInfo throws', () => {
    const editor = {
      Components: {
        getSymbolInfo: vi.fn().mockImplementation(() => {
          throw new Error('test error');
        }),
      },
    };
    expect(getSymbolInfo(editor, {})).toBeNull();
  });

  it('returns null when getSymbolInfo returns falsy', () => {
    const editor = {
      Components: {
        getSymbolInfo: vi.fn().mockReturnValue(null),
      },
    };
    expect(getSymbolInfo(editor, {})).toBeNull();
  });
});

// ── findMainByGrapesId ─────────────────────────────────────────

describe('findMainByGrapesId', () => {
  it('finds a main symbol by ID', () => {
    const main = { getId: () => 'sym-1' };
    const editor = {
      Components: {
        getSymbols: vi.fn().mockReturnValue([main, { getId: () => 'sym-2' }]),
      },
    };
    expect(findMainByGrapesId(editor, 'sym-1')).toBe(main);
  });

  it('returns null when no match found', () => {
    const editor = {
      Components: {
        getSymbols: vi.fn().mockReturnValue([{ getId: () => 'sym-1' }]),
      },
    };
    expect(findMainByGrapesId(editor, 'sym-99')).toBeNull();
  });

  it('returns null when getSymbols returns empty', () => {
    const editor = {
      Components: { getSymbols: vi.fn().mockReturnValue([]) },
    };
    expect(findMainByGrapesId(editor, 'sym-1')).toBeNull();
  });

  it('returns null when editor is null', () => {
    expect(findMainByGrapesId(null, 'sym-1')).toBeNull();
  });

  it('returns null when getSymbols throws', () => {
    const editor = {
      Components: {
        getSymbols: vi.fn().mockImplementation(() => {
          throw new Error('test');
        }),
      },
    };
    expect(findMainByGrapesId(editor, 'sym-1')).toBeNull();
  });
});

// ── serializeMainSymbol ────────────────────────────────────────

describe('serializeMainSymbol', () => {
  it('serializes a main symbol via toJSON', () => {
    const json = { tagName: 'div', type: 'default' };
    const main = { toJSON: vi.fn().mockReturnValue(json) };
    expect(serializeMainSymbol(main)).toEqual(json);
  });

  it('returns null when main is null', () => {
    expect(serializeMainSymbol(null)).toBeNull();
  });

  it('returns null when toJSON is undefined', () => {
    expect(serializeMainSymbol({})).toBeNull();
  });

  it('returns null when toJSON throws', () => {
    const main = {
      toJSON: vi.fn().mockImplementation(() => {
        throw new Error('test');
      }),
    };
    expect(serializeMainSymbol(main)).toBeNull();
  });
});
