// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { MantineProvider } from '@mantine/core';
import { createReference, indexSearchParameter } from '@medplum/core';
import type { Observation, SearchParameter } from '@medplum/fhirtypes';
import { HomerSimpson, MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Measurement } from './Measurement';

vi.mock('../../components/LineChart', () => ({
  LineChart: ({ chartData }: { chartData: { datasets: { label: string; data: number[] }[] } }) => (
    <pre data-testid="chart">{JSON.stringify(chartData.datasets.map((d) => [d.label, d.data]))}</pre>
  ),
}));

async function setup(medplum: MockClient): Promise<void> {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={['/vitals/blood-pressure']}>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Suspense>
              <Routes>
                <Route path="/vitals/:measurementId" element={<Measurement />} />
              </Routes>
            </Suspense>
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  });
}

describe('Measurement', () => {
  beforeAll(() => {
    // MockClient doesn't index Observation code or patient; `patient` is simplified to the plain subject
    const params: [string, SearchParameter['type'], string][] = [
      ['code', 'token', 'Observation.code'],
      ['patient', 'reference', 'Observation.subject'],
    ];
    for (const [code, type, expression] of params) {
      indexSearchParameter({
        resourceType: 'SearchParameter',
        url: `http://hl7.org/fhir/SearchParameter/Observation-${code}`,
        name: code,
        status: 'active',
        description: code,
        code,
        base: ['Observation'],
        type,
        expression,
      });
    }
  });

  test('Saves a blood pressure as a vital sign with systolic and diastolic codes', async () => {
    const medplum = new MockClient({ profile: HomerSimpson });
    const create = vi.spyOn(medplum, 'createResource');
    await setup(medplum);

    fireEvent.click(screen.getByRole('button', { name: 'Add Measurement' }));
    fireEvent.change(await screen.findByLabelText('Systolic'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Diastolic'), { target: { value: '80' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    });

    const saved = (await create.mock.results[0].value) as Observation;
    expect(saved.category?.[0].coding?.[0].code).toBe('vital-signs');
    expect(saved.component?.map((c) => [c.code?.coding?.[0].code, c.valueQuantity?.value])).toEqual([
      ['8480-6', 120],
      ['8462-4', 80],
    ]);
  });

  test("Charts each value by its code, including a doctor's systolic-only reading", async () => {
    const medplum = new MockClient({ profile: HomerSimpson });
    await medplum.createResource<Observation>({
      resourceType: 'Observation',
      status: 'final',
      subject: createReference(HomerSimpson),
      code: { coding: [{ system: 'http://loinc.org', code: '85354-9' }] },
      effectiveDateTime: '2026-10-01T10:00:00Z',
      component: [
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8480-6' }] },
          valueQuantity: { value: 130, unit: 'mm[Hg]' },
        },
      ],
    });
    await setup(medplum);

    expect(await screen.findByTestId('chart')).toHaveTextContent('[["Systolic",[130]],["Diastolic",[null]]]');
  });
});
