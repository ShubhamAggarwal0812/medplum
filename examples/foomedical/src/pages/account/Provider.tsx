// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Alert, Box, Button, Group, Stack, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { createReference, getReferenceString, normalizeErrorString, resolveId } from '@medplum/core';
import type { Patient, Practitioner, Reference } from '@medplum/fhirtypes';
import { ResourceAvatar, ResourceName, useMedplum, useMedplumProfile, useResource } from '@medplum/react';
import { useSearchResources } from '@medplum/react-hooks';
import { IconCircleCheck, IconCircleOff } from '@tabler/icons-react';
import { useState } from 'react';
import type { JSX } from 'react';
import { InfoSection } from '../../components/InfoSection';
import { Loading } from '../../components/Loading';

export function Provider(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient;
  // The session profile isn't refreshed after an update, so read the patient to see the saved provider
  const savedPatient = useResource<Patient>({ reference: getReferenceString(profile) });
  const [updatedPatient, setUpdatedPatient] = useState<Patient>();
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const patient = updatedPatient ?? savedPatient;

  if (!patient) {
    return <Loading />;
  }

  const provider = patient.generalPractitioner?.[0];

  const handleChoose = async (practitioner: Practitioner): Promise<void> => {
    setSaving(true);
    try {
      const updated = await medplum.updateResource<Patient>({
        ...patient,
        generalPractitioner: [createReference(practitioner)],
      });
      setUpdatedPatient(updated);
      setChoosing(false);
      showNotification({ icon: <IconCircleCheck />, title: 'Success', message: 'Provider saved' });
    } catch (err) {
      showNotification({ color: 'red', icon: <IconCircleOff />, title: 'Error', message: normalizeErrorString(err) });
    } finally {
      setSaving(false);
    }
  };

  if (provider && !choosing) {
    return (
      <Box p="xl">
        <Title mb="lg">My Provider</Title>
        <InfoSection title="My Primary Care Provider">
          <Box p="xl">
            <Stack align="center">
              <ResourceAvatar size={200} radius={100} value={provider} />
              <Title order={2}>
                <ResourceName value={provider} />
              </Title>
              <Button size="lg" onClick={() => setChoosing(true)}>
                Change provider
              </Button>
            </Stack>
          </Box>
        </InfoSection>
      </Box>
    );
  }

  return (
    <Box p="xl">
      <Title mb="lg">Choose a provider</Title>
      <InfoSection title="My Primary Care Provider">
        <ProviderList currentProvider={provider} saving={saving} onChoose={handleChoose} />
        {provider && (
          <Group justify="center" pb="xl">
            <Button variant="default" disabled={saving} onClick={() => setChoosing(false)}>
              Cancel
            </Button>
          </Group>
        )}
      </InfoSection>
    </Box>
  );
}

interface ProviderListProps {
  readonly currentProvider?: Reference;
  readonly saving: boolean;
  readonly onChoose: (practitioner: Practitioner) => Promise<void>;
}

function ProviderList(props: ProviderListProps): JSX.Element {
  const [practitioners, loading, outcome] = useSearchResources('Practitioner', { _count: '100' });

  if (loading) {
    return <Loading />;
  }

  if (!practitioners) {
    return (
      <Alert color="red" title="Could not load the list of providers" m="xl">
        {normalizeErrorString(outcome)}
      </Alert>
    );
  }

  if (practitioners.length === 0) {
    return (
      <Text p="xl" c="dimmed">
        No providers are available yet.
      </Text>
    );
  }

  return (
    <Stack gap="md" p="xl">
      {practitioners.map((practitioner) => {
        const isCurrent = practitioner.id === resolveId(props.currentProvider);
        return (
          <Group key={practitioner.id} justify="space-between">
            <Group>
              <ResourceAvatar value={practitioner} radius="xl" />
              <ResourceName value={practitioner} />
            </Group>
            <Button
              variant={isCurrent ? 'light' : 'filled'}
              disabled={isCurrent || props.saving}
              onClick={() => props.onChoose(practitioner)}
            >
              {isCurrent ? 'Current provider' : 'Choose'}
            </Button>
          </Group>
        );
      })}
    </Stack>
  );
}
