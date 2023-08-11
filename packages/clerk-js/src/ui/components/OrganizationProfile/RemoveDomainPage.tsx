import type { OrganizationDomainResource } from '@clerk/types';
import React from 'react';

import { RemoveResourcePage } from '../../common';
import { useCoreOrganization } from '../../contexts';
import { Flex, Spinner } from '../../customizables';
import { useFetch } from '../../hooks';
import { localizationKeys } from '../../localization';
import { useRouter } from '../../router';
import { OrganizationProfileBreadcrumbs } from './OrganizationProfileNavbar';

export const RemoveDomainPage = () => {
  const { organization } = useCoreOrganization();
  const { params } = useRouter();

  const ref = React.useRef<OrganizationDomainResource>();
  const { data: domain, status: domainStatus } = useFetch(
    organization?.getDomain,
    {
      domainId: params.id,
    },
    {
      onSuccess(domain) {
        ref.current = { ...domain };
      },
    },
  );

  if (domainStatus.isLoading || !domain) {
    return (
      <Flex
        direction={'row'}
        align={'center'}
        justify={'center'}
        sx={t => ({
          height: '100%',
          minHeight: t.sizes.$120,
        })}
      >
        <Spinner
          size={'lg'}
          colorScheme={'primary'}
        />
      </Flex>
    );
  }

  return (
    <RemoveResourcePage
      title={localizationKeys('organizationProfile.removeDomainPage.title')}
      messageLine1={localizationKeys('organizationProfile.removeDomainPage.messageLine1', {
        domain: ref.current?.name,
      })}
      messageLine2={localizationKeys('organizationProfile.removeDomainPage.messageLine2')}
      successMessage={localizationKeys('organizationProfile.removeDomainPage.successMessage', {
        domain: ref.current?.name,
      })}
      deleteResource={() => Promise.resolve(domain?.delete())}
      Breadcrumbs={OrganizationProfileBreadcrumbs}
    />
  );
};