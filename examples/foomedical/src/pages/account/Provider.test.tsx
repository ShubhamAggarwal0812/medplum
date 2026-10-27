// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { createReference } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { DrAliceSmith, HomerSimpson, MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Provider } from './Provider';

async function setup(medplum: MockClient): Promise<void> {
  await act(async () => {
    render(
      <MemoryRouter>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Notifications />
            <Provider />
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  });
}

describe('Provider', () => {
  test('Patient chooses a primary care provider', async () => {
    const medplum = new MockClient({ profile: HomerSimpson });
    await setup(medplum);

    fireEvent.click(await screen.findByRole('button', { name: 'Choose' }));

    expect(await screen.findByText('Provider saved')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Provider' })).toBeInTheDocument();
    const saved = await medplum.readResource('Patient', HomerSimpson.id as string);
    expect(saved.generalPractitioner).toEqual([createReference(DrAliceSmith)]);
  });

  test('Shows the saved provider and lets the patient back out of changing it', async () => {
    const medplum = new MockClient({ profile: HomerSimpson });
    // Saved after sign-in, so only the server copy has it, not the session profile
    await medplum.updateResource<Patient>({ ...HomerSimpson, generalPractitioner: [createReference(DrAliceSmith)] });
    await setup(medplum);

    expect(await screen.findByRole('heading', { name: 'My Provider' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change provider' }));
    expect(await screen.findByRole('button', { name: 'Current provider' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'My Provider' })).toBeInTheDocument();
  });

  test('Blocks a second choice while the first is saving', async () => {
    const medplum = new MockClient({ profile: HomerSimpson });
    vi.spyOn(medplum, 'updateResource').mockReturnValue(new Promise(() => {}));
    await setup(medplum);

    const choose = await screen.findByRole('button', { name: 'Choose' });
    fireEvent.click(choose);

    expect(choose).toBeDisabled();
  });

  test('Explains when the providers cannot be loaded', async () => {
    const medplum = new MockClient({ profile: HomerSimpson });
    vi.spyOn(medplum, 'searchResources').mockRejectedValue(new Error('Forbidden'));
    await setup(medplum);

    expect(await screen.findByText('Could not load the list of providers')).toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });
});
