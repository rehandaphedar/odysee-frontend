// @flow
import React, { useEffect } from 'react';

import './style.scss';
import { FormField } from 'component/common/form';
import Card from 'component/common/card';
import I18nMessage from 'component/i18nMessage';
import Button from 'component/button';
import * as PAGES from 'constants/pages';
import { PAYWALL } from 'constants/publish';
import { filterMembershipTiersWithPerk, getRestrictivePerkName } from 'util/memberships';

type Props = {
  updatePublishForm: (UpdatePublishState) => void,
  getMembershipTiersForContentClaimId: (type: string) => void,
  claim: Claim,
  activeChannel: ChannelClaim,
  incognito: boolean,
  getExistingTiers: ({ channel_name: string, channel_id: string }) => Promise<CreatorMemberships>,
  myMembershipTiers: Array<MembershipTier>,
  isStillEditing: boolean,
  type: PublishType,
  liveCreateType: LiveCreateType,
  liveEditType: LiveEditType,
  memberRestrictionOn: boolean,
  memberRestrictionTierIds: Array<number>,
  paywall: Paywall,
  visibility: Visibility,
};

function PublishProtectedContent(props: Props) {
  const {
    activeChannel,
    incognito,
    updatePublishForm,
    getMembershipTiersForContentClaimId,
    claim,
    getExistingTiers,
    myMembershipTiers,
    type,
    liveCreateType,
    liveEditType,
    memberRestrictionOn,
    memberRestrictionTierIds,
    paywall,
    visibility,
  } = props;

  const claimId = claim?.claim_id;

  const perkName = React.useMemo(() => {
    return getRestrictivePerkName(type, liveCreateType, liveEditType);
  }, [liveCreateType, liveEditType, type]);

  const validTierIdsForPerk = React.useMemo(() => {
    const validTiers = myMembershipTiers ? filterMembershipTiersWithPerk(myMembershipTiers, perkName) : [];
    return validTiers.map((tier) => tier?.Membership?.id);
  }, [perkName, myMembershipTiers]);

  // Fetch tiers for current claim
  React.useEffect(() => {
    if (claimId) {
      getMembershipTiersForContentClaimId(claimId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- @see TODO_NEED_VERIFICATION
  }, [claimId]);

  // Keep track of active channel using `channelClaimId` (??)
  React.useEffect(() => {
    if (!activeChannel) return;

    updatePublishForm({
      channelClaimId: activeChannel.claim_id,
    });
  }, [activeChannel, updatePublishForm]);

  // Remove previous selections that are no longer valid.
  React.useEffect(() => {
    const filteredTierIds = memberRestrictionTierIds.filter((id) => validTierIdsForPerk.includes(id));
    if (filteredTierIds.length < memberRestrictionTierIds.length) {
      updatePublishForm({ memberRestrictionTierIds: filteredTierIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-filter when validTierIdsForPerk changes.
  }, [validTierIdsForPerk]);

  function toggleMemberRestrictionOn() {
    updatePublishForm({ memberRestrictionOn: !memberRestrictionOn });
  }

  function toggleMemberRestrictionTierId(id: number) {
    if (memberRestrictionTierIds.includes(id)) {
      updatePublishForm({
        memberRestrictionTierIds: memberRestrictionTierIds.filter((x) => x !== id),
      });
    } else {
      updatePublishForm({
        memberRestrictionTierIds: memberRestrictionTierIds.concat(id),
      });
    }
  }

  useEffect(() => {
    if (activeChannel) {
      getExistingTiers({
        channel_name: activeChannel.normalized_name,
        channel_id: activeChannel.claim_id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- @see TODO_NEED_VERIFICATION
  }, [activeChannel]);

  if (incognito) return null;

  if (!myMembershipTiers || (myMembershipTiers && myMembershipTiers.length === 0)) {
    return (
      <>
        <Card
          background
          isBodyList
          title={__('Restrict Content')}
          body={
            <div className="settings-row publish-row--locked">
              <I18nMessage
                tokens={{
                  activate_your_memberships: (
                    <Button
                      navigate={`/$/${PAGES.CREATOR_MEMBERSHIPS}`}
                      label={__('activate your memberships')}
                      button="link"
                    />
                  ),
                }}
              >
                Please %activate_your_memberships% first to to use this functionality.
              </I18nMessage>
            </div>
          }
        />
      </>
    );
  }

  if (validTierIdsForPerk.length === 0) {
    return (
      <Card
        background
        isBodyList
        title={__('Restrict Content')}
        body={
          <div className="publish-row publish-row-tiers">
            <div className="publish-row__reason">
              {__('The selected channel has no membership tiers with exclusive-content perks for the current setup.')}
            </div>
          </div>
        }
      />
    );
  }

  if (validTierIdsForPerk.length > 0) {
    if (visibility === 'unlisted') {
      return (
        <Card
          background
          isBodyList
          title={__('Restrict Content')}
          body={
            <div className="publish-row publish-row-tiers">
              <div className="publish-row__reason">
                {__('Membership restrictions are not available for Unlisted content.')}
              </div>
            </div>
          }
        />
      );
    }

    return (
      <>
        <Card
          background
          isBodyList
          title={__('Restrict Content')}
          body={
            <div className="publish-row publish-row-tiers">
              <FormField
                type="checkbox"
                disabled={paywall !== PAYWALL.FREE}
                checked={memberRestrictionOn}
                label={__('Restrict content to only allow subscribers to certain memberships to view it')}
                name={'toggleRestrictedContent'}
                className="restrict-content__checkbox"
                onChange={toggleMemberRestrictionOn}
              />

              {memberRestrictionOn && (
                <div className="tier-list">
                  {myMembershipTiers.map((tier: MembershipTier) => {
                    const show = validTierIdsForPerk.includes(tier.Membership.id);
                    return show ? (
                      <FormField
                        disabled={paywall !== PAYWALL.FREE}
                        key={tier.Membership.id}
                        type="checkbox"
                        checked={memberRestrictionTierIds.includes(tier.Membership.id)}
                        label={tier.Membership.name}
                        name={tier.Membership.id}
                        onChange={() => toggleMemberRestrictionTierId(tier.Membership.id)}
                      />
                    ) : (
                      <div key={tier.Membership.id} className="dummy-tier" />
                    );
                  })}
                </div>
              )}

              {paywall !== PAYWALL.FREE && (
                <div className="error__text">
                  {__('This file has an attached price, disable it in order to add content restrictions.')}
                </div>
              )}
            </div>
          }
        />
      </>
    );
  }

  return null;
}

export default PublishProtectedContent;
