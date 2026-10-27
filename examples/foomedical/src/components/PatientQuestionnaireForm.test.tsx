// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { getReferenceString } from '@medplum/core';
import type { ProfileResource } from '@medplum/core';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PatientIntakeQuestionnairePage } from '../pages/PatientIntakeQuestionnairePage';
import { ScreeningQuestionnairePage } from '../pages/ScreeningQuestionnairePage';

async function setup(medplum: MockClient, page: JSX.Element): Promise<void> {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={['/form']}>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Notifications />
            <Routes>
              <Route path="/form" element={page} />
              <Route path="/health-record/questionnaire-responses" element={<div>Responses list</div>} />
            </Routes>
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  });
}

describe('PatientQuestionnaireForm', () => {
  test.each([
    ['intake', <PatientIntakeQuestionnairePage />, 'https://medplum.com/Questionnaire/foomedical-patient-intake'],
    ['screening', <ScreeningQuestionnairePage />, 'http://lforms-fhir.nlm.nih.gov/baseR4'],
  ])('Saves the %s answers for the patient', async (_name, page, questionnaireUrl) => {
    const medplum = new MockClient();
    const createResource = vi.spyOn(medplum, 'createResource');
    await setup(medplum, page);

    fireEvent.submit(screen.getByTestId('questionnaire-form'));

    const profileReference = getReferenceString(medplum.getProfile() as ProfileResource);
    expect(createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'QuestionnaireResponse',
        questionnaire: questionnaireUrl,
        subject: expect.objectContaining({ reference: profileReference }),
        source: expect.objectContaining({ reference: profileReference }),
      })
    );
    expect(await screen.findByText('Responses list')).toBeInTheDocument();
  });

  test('Shows an error when saving fails', async () => {
    const medplum = new MockClient();
    vi.spyOn(medplum, 'createResource').mockRejectedValue(new Error('Forbidden'));
    await setup(medplum, <ScreeningQuestionnairePage />);

    fireEvent.submit(screen.getByTestId('questionnaire-form'));

    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Responses list')).not.toBeInTheDocument();
  });
});
