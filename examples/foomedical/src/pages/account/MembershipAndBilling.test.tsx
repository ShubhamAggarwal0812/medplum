// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { MantineProvider } from '@mantine/core';
import { createReference, indexSearchParameter } from '@medplum/core';
import type { Invoice, SearchParameter } from '@medplum/fhirtypes';
import { BartSimpson, HomerSimpson, MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MembershipAndBilling } from './MembershipAndBilling';

function invoice(subject: Invoice['subject'], date: string, status: Invoice['status'], value: number): Invoice {
  return { resourceType: 'Invoice', subject, date, status, totalGross: { value, currency: 'USD' } };
}

describe('MembershipAndBilling', () => {
  beforeAll(() => {
    // MockClient only indexes a few search parameters, none of them on Invoice
    const params: [string, SearchParameter['type']][] = [
      ['subject', 'reference'],
      ['status', 'token'],
      ['date', 'date'],
    ];
    for (const [code, type] of params) {
      indexSearchParameter({
        resourceType: 'SearchParameter',
        url: `http://hl7.org/fhir/SearchParameter/Invoice-${code}`,
        name: code,
        status: 'active',
        description: code,
        code,
        base: ['Invoice'],
        type,
        expression: `Invoice.${code}`,
      });
    }
  });

  test("Lists only the patient's own issued and paid invoices, newest first", async () => {
    const medplum = new MockClient({ profile: HomerSimpson });
    const homer = createReference(HomerSimpson);
    await medplum.createResource(invoice(homer, '2026-09-01', 'balanced', 40));
    await medplum.createResource(invoice(homer, '2026-10-01', 'issued', 25));
    await medplum.createResource(invoice(homer, '2026-10-15', 'draft', 99));
    await medplum.createResource(invoice(createReference(BartSimpson), '2026-10-20', 'issued', 77));

    await act(async () => {
      render(
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Suspense>
              <MembershipAndBilling />
            </Suspense>
          </MantineProvider>
        </MedplumProvider>
      );
    });

    const rows = (await screen.findAllByRole('row')).map((r) => r.textContent ?? '');
    const due = rows.findIndex((r) => r.endsWith('$25.00Due'));
    const paid = rows.findIndex((r) => r.endsWith('$40.00Paid'));
    expect(due).toBeGreaterThan(0);
    expect(paid).toBeGreaterThan(due);
    expect(rows.join()).not.toMatch(/\$99\.00|\$77\.00/);
  });
});
