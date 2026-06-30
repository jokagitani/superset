/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  CategoricalColorNamespace,
  CategoricalScheme,
  getCategoricalSchemeRegistry,
  getLabelsColorMap,
  LabelsColorMapSource,
} from '@superset-ui/core';
import {
  applyColors,
  enforceSharedLabelsColorsArray,
  getColorNamespace,
  getColorSchemeDomain,
  getDynamicLabelsColors,
  getFreshLabelsColorMapEntries,
  getFreshSharedLabels,
  getSharedLabelsColorMapEntries,
  isLabelsColorMapSynced,
  refreshLabelsColorMap,
  resetColors,
} from 'src/utils/colorScheme';

beforeAll(() => {
  getCategoricalSchemeRegistry().registerValue(
    'testColors',
    new CategoricalScheme({
      id: 'testColors',
      colors: ['red', 'green', 'blue'],
    }),
  );
});

beforeEach(() => {
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.source = LabelsColorMapSource.Dashboard;
  labelsColorMap.reset();
  CategoricalColorNamespace.getNamespace().resetColors();
});

test('getColorNamespace returns the namespace when truthy', () => {
  expect(getColorNamespace('myNamespace')).toEqual('myNamespace');
});

test('getColorNamespace coerces falsy values to undefined', () => {
  expect(getColorNamespace('')).toBeUndefined();
  expect(getColorNamespace(undefined)).toBeUndefined();
});

test('enforceSharedLabelsColorsArray returns arrays unchanged', () => {
  expect(enforceSharedLabelsColorsArray(['a', 'b'])).toEqual(['a', 'b']);
});

test('enforceSharedLabelsColorsArray returns an empty array for non-arrays', () => {
  expect(enforceSharedLabelsColorsArray({ a: 'red' })).toEqual([]);
  expect(enforceSharedLabelsColorsArray(undefined)).toEqual([]);
});

test('getFreshSharedLabels returns labels shared across multiple charts', () => {
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.addSlice('a', 'red', 1);
  labelsColorMap.addSlice('b', 'blue', 1);
  labelsColorMap.addSlice('a', 'red', 2);

  expect(getFreshSharedLabels()).toEqual(['a']);
});

test('getFreshSharedLabels merges existing shared labels with fresh duplicates', () => {
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.addSlice('a', 'red', 1);
  labelsColorMap.addSlice('a', 'red', 2);

  expect(getFreshSharedLabels(['existing'])).toEqual(['existing', 'a']);
});

test('getFreshSharedLabels returns no duplicates when none are shared', () => {
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.addSlice('a', 'red', 1);
  labelsColorMap.addSlice('b', 'blue', 2);

  expect(getFreshSharedLabels()).toEqual([]);
});

test('getSharedLabelsColorMapEntries keeps only entries present in shared labels', () => {
  const colorMap = { a: 'red', b: 'blue', c: 'green' };

  expect(getSharedLabelsColorMapEntries(colorMap, ['a', 'c'])).toEqual({
    a: 'red',
    c: 'green',
  });
});

test('getSharedLabelsColorMapEntries returns an empty object when nothing is shared', () => {
  expect(getSharedLabelsColorMapEntries({ a: 'red' }, [])).toEqual({});
});

test('getFreshLabelsColorMapEntries excludes custom label colors', () => {
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.addSlice('a', 'red', 1);
  labelsColorMap.addSlice('b', 'blue', 1);

  expect(getFreshLabelsColorMapEntries({ a: 'custom' })).toEqual({ b: 'blue' });
});

test('getFreshLabelsColorMapEntries returns all entries without custom colors', () => {
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.addSlice('a', 'red', 1);

  expect(getFreshLabelsColorMapEntries()).toEqual({ a: 'red' });
});

test('getDynamicLabelsColors omits custom label colors', () => {
  const fullLabelsColors = { a: 'red', b: 'blue', c: 'green' };

  expect(getDynamicLabelsColors(fullLabelsColors, { b: 'blue' })).toEqual({
    a: 'red',
    c: 'green',
  });
});

test('getDynamicLabelsColors returns all colors when there are no custom colors', () => {
  const fullLabelsColors = { a: 'red', b: 'blue' };

  expect(getDynamicLabelsColors(fullLabelsColors)).toEqual(fullLabelsColors);
});

test('getColorSchemeDomain returns the colors of a registered scheme', () => {
  expect(getColorSchemeDomain('testColors')).toEqual(['red', 'green', 'blue']);
});

test('getColorSchemeDomain always returns an array', () => {
  expect(Array.isArray(getColorSchemeDomain('doesNotExist'))).toEqual(true);
});

test('isLabelsColorMapSynced is true when fresh colors are empty', () => {
  expect(isLabelsColorMapSynced({ a: 'red' }, {}, {})).toEqual(true);
});

test('isLabelsColorMapSynced is true when common keys match', () => {
  expect(
    isLabelsColorMapSynced({ a: 'red', b: 'blue' }, { a: 'red' }, {}),
  ).toEqual(true);
});

test('isLabelsColorMapSynced is false when common keys differ', () => {
  expect(isLabelsColorMapSynced({ a: 'red' }, { a: 'green' }, {})).toEqual(
    false,
  );
});

test('isLabelsColorMapSynced ignores custom label colors when comparing', () => {
  expect(
    isLabelsColorMapSynced({ a: 'red' }, { a: 'green' }, { a: 'green' }),
  ).toEqual(true);
});

test('resetColors clears forced colors and the labels color map', () => {
  const namespace = CategoricalColorNamespace.getNamespace();
  namespace.setColor('a', 'red');
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.addSlice('a', 'red', 1);

  resetColors();

  expect(namespace.forcedItems).toEqual({});
  expect(Object.fromEntries(labelsColorMap.getColorMap())).toEqual({});
});

test('refreshLabelsColorMap updates the labels color map for the scheme', () => {
  const labelsColorMap = getLabelsColorMap();
  labelsColorMap.addSlice('a', 'red', 1);

  refreshLabelsColorMap(undefined, 'testColors');

  expect(Object.keys(Object.fromEntries(labelsColorMap.getColorMap()))).toEqual(
    ['a'],
  );
});

test('applyColors applies custom label colors to the namespace', () => {
  applyColors({
    color_scheme: 'testColors',
    label_colors: { a: 'purple' },
  });

  expect(CategoricalColorNamespace.getNamespace().forcedItems.a).toEqual(
    'purple',
  );
});

test('applyColors resets forced colors when fresh is true', () => {
  const namespace = CategoricalColorNamespace.getNamespace();
  namespace.setColor('stale', 'black');

  applyColors(
    {
      color_scheme: 'testColors',
      label_colors: { a: 'purple' },
    },
    true,
  );

  expect(namespace.forcedItems.stale).toBeUndefined();
  expect(namespace.forcedItems.a).toEqual('purple');
});

test('applyColors applies only shared labels when shared is true', () => {
  const namespace = CategoricalColorNamespace.getNamespace();

  applyColors(
    {
      color_scheme: 'testColors',
      map_label_colors: { a: 'red', b: 'blue' },
      shared_label_colors: ['a'],
    },
    false,
    false,
    true,
  );

  expect(namespace.forcedItems.a).toEqual('red');
  expect(namespace.forcedItems.b).toBeUndefined();
});
