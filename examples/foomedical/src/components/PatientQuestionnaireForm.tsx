// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { showNotification } from '@mantine/notifications';
import { createReference, normalizeErrorString } from '@medplum/core';
import type { Patient, Questionnaire, QuestionnaireResponse } from '@medplum/fhirtypes';
import { Document, QuestionnaireForm, useMedplum, useMedplumProfile } from '@medplum/react';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { useCallback } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';

export interface PatientQuestionnaireFormProps {
  readonly questionnaire: Questionnaire;
}

export function PatientQuestionnaireForm(props: PatientQuestionnaireFormProps): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const patient = useMedplumProfile() as Patient;

  const handleOnSubmit = useCallback(
    (response: QuestionnaireResponse) => {
      medplum
        .createResource(response)
        .then(() => {
          showNotification({
            icon: <IconCircleCheck />,
            title: 'Success',
            message: 'Answers recorded',
          });
          navigate('/health-record/questionnaire-responses/')?.catch(console.error);
          window.scrollTo(0, 0);
        })
        .catch((err) => {
          showNotification({
            color: 'red',
            icon: <IconCircleOff />,
            title: 'Error',
            message: normalizeErrorString(err),
          });
        });
    },
    [medplum, navigate]
  );

  return (
    <Document width={800}>
      <QuestionnaireForm
        questionnaire={props.questionnaire}
        subject={createReference(patient)}
        onSubmit={handleOnSubmit}
      />
    </Document>
  );
}
