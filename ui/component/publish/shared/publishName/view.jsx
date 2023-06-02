// @flow
import { DOMAIN } from 'config';
import { INVALID_NAME_ERROR } from 'constants/claim';
import React, { useState, useEffect } from 'react';
import { isNameValid } from 'util/lbryURI';
import { FormField } from 'component/common/form';
import NameHelpText from './name-help-text';
import { useIsMobile } from 'effects/use-screensize';
import useThrottle from 'effects/use-throttle';

type Props = {
  name: string,
  // TODO: unclear whether 'uri' comes from client or redux. It's currently both.
  uri: string,
  isStillEditing: boolean,
  myClaimForUri: ?StreamClaim,
  myClaimForUriCaseInsensitive: ?StreamClaim,
  amountNeededForTakeover: number,
  prepareEdit: ({}, string) => void,
  updatePublishForm: (UpdatePublishState) => void,
  activeChannelClaim: ?ChannelClaim,
  incognito: boolean,
  currentUploads: { [key: string]: FileUploadItem },
};

function PublishName(props: Props) {
  const {
    name: publishFormName,
    uri,
    isStillEditing,
    myClaimForUri,
    myClaimForUriCaseInsensitive,
    prepareEdit,
    updatePublishForm,
    activeChannelClaim,
    incognito,
    currentUploads,
  } = props;

  const [name, setName] = useState(publishFormName);
  const nameThrottled = useThrottle(name, 750);

  const [nameError, setNameError] = useState(undefined);
  const [blurred, setBlurred] = React.useState(false);
  const activeChannelName = activeChannelClaim && activeChannelClaim.name;
  const isMobile = useIsMobile();

  let prefix = IS_WEB ? (isMobile ? '' : `${DOMAIN}/`) : 'lbry://';
  if (activeChannelName && !incognito) {
    prefix += `${activeChannelName}/`;
  }

  function editExistingClaim() {
    if (myClaimForUri) {
      prepareEdit(myClaimForUri, uri);
    }
  }

  function handleNameChange(event) {
    setName(event.target.value);
  }

  useEffect(() => {
    // Cases: Form was cleared; Sanitized; New file selected
    if (publishFormName !== name) {
      setName(publishFormName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one way update only
  }, [publishFormName]);

  useEffect(() => {
    updatePublishForm({ name: nameThrottled || '' });
  }, [nameThrottled, updatePublishForm]);

  useEffect(() => {
    if (!blurred && !name) {
      return;
    }

    let nameError;
    if (!name) {
      nameError = __('A name is required');
    } else if (!isNameValid(name)) {
      nameError = INVALID_NAME_ERROR;
    }

    setNameError(nameError);
  }, [name, blurred]);

  return (
    <>
      <fieldset-group class="fieldset-group--smushed fieldset-group--disabled-prefix">
        <fieldset-section>
          <label>{__('URL')}</label>
          <div className="form-field__prefix">{prefix}</div>
        </fieldset-section>
        <FormField
          type="text"
          name="content_name"
          value={name}
          error={nameError}
          disabled={isStillEditing}
          onChange={handleNameChange}
          onBlur={() => setBlurred(true)}
          autoComplete="off"
        />
      </fieldset-group>

      <div className="form-field__help">
        <NameHelpText
          uri={uri}
          isStillEditing={isStillEditing}
          myClaimForUri={myClaimForUri}
          myClaimForUriCaseInsensitive={myClaimForUriCaseInsensitive}
          currentUploads={currentUploads}
          onEditMyClaim={editExistingClaim}
        />
      </div>
    </>
  );
}

export default PublishName;
