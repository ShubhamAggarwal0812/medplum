// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { Questionnaire } from '@medplum/fhirtypes';
import { useResource } from '@medplum/react';
import type { JSX } from 'react';
import { useParams } from 'react-router';
import { Loading } from '../components/Loading';
import { PatientQuestionnaireForm } from '../components/PatientQuestionnaireForm';

export function QuestionnairePage(): JSX.Element {
  const { questionnaireId } = useParams();
  const questionnaire = useResource<Questionnaire>({ reference: `Questionnaire/${questionnaireId}` });

  if (!questionnaire) {
    return <Loading />;
  }

  return <PatientQuestionnaireForm questionnaire={questionnaire} />;
}
