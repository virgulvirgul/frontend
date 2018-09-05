import Parse from 'parse';
import fetch_helpers from './../../libs/fetch_helpers';
import history from './../../main/history';
import { trackMetamaskConnected, trackLedgerConnected } from 'libs/analytics';
import axios from 'libs/axios';
import { getSession } from 'libs/user-session';

export const user_profile_fetched = user_profile => {
  return {
    type: 'USER_PROFILE_FETCHED',
    payload: user_profile,
  };
};

export const user_services_fetched = user_services => {
  return {
    type: 'USER_SERVICES_FETCHED',
    payload: user_services,
  };
};

export const categorizedTripsFetched = trips => ({
  type: 'ACCOUNT/CATEGORIZED_TRIPS_FETCHED',
  payload: trips,
});

export const categorizedTripsFetchStarted = trips => ({
  type: 'ACCOUNT/CATEGORIZED_TRIPS_FETCH_STARTED',
});

export const edit_user_error_raised = error => {
  return {
    type: 'EDIT_USER_ERROR_SET',
    payload: error,
  };
};

export const fetch_user_profile = () => async dispatch => {
  const session = getSession();
  if (session) {
    const user = axios.get('/users/me').catch(error => {
      console.log(error);
      //dispatch(setLoginError({code: error.response.status, message: error.response.data.error_description}));
    });
    dispatch(user_profile_fetched({ user_profile: user.data }));
  } else {
    history.push('/login');
  }
};

export const update_user_service_status = e => async dispatch => {
  let status = e.target.dataset.status;
  let serviceId = e.target.dataset.objectId;

  if (!serviceId || !status) {
    console.error(new Error("can't update service status without serviceId and status"));
  }

  const serviceObject = await fetch_helpers.build_query('Service').get(serviceId);
  serviceObject.set('serviceStatus', status);
  await serviceObject.save();

  dispatch(fetch_user_services());
};

export const fetch_user_services = () => async dispatch => {
  const session = getSession();
  if (session) {
    const userServices = await axios.get(`/services`);
    const services = fetch_helpers.buildServicesJson(userServices.data);
    dispatch({
      type: 'USER_SERVICES_FETCHED',
      payload: { user_services: services },
    });
  } else {
    history.push('/');
  }
};

export const fetch_user_trips = (owner_id, trip_state) => dispatch => {
  dispatch(categorizedTripsFetchStarted());
  if (trip_state === 'planned') {
    Parse.Cloud.run('myPlannedTrips')
      .then(fetch_helpers.normalizeParseResponseData)
      .then(result => dispatch(categorizedTripsFetched({ planned_trips: result })));
  } else if (trip_state === 'completed') {
    Parse.Cloud.run('myCompletedTrips')
      .then(fetch_helpers.normalizeParseResponseData)
      .then(result => dispatch(categorizedTripsFetched({ completed_trips: result })));
  } else if (trip_state === 'all') {
    Parse.Cloud.run('myAllTrips')
      .then(fetch_helpers.normalizeParseResponseData)
      .then(result => dispatch(categorizedTripsFetched({ all_trips: result })));
  }
};

export const clearMetamaskErrors = () => dispatch => {
  dispatch({ type: 'METAMASK_ERROR', payload: {} });
};

// NOTE: for now it always signs "please"
export const signData = () => async dispatch => {
  // clear metamask errors
  dispatch({ type: 'METAMASK_ERROR', payload: {} });

  try {
    const [{ signMessage }, { nonce }] = await Promise.all([
      import('../../libs/web3-utils'),
      Parse.Cloud.run('getNonceForUser'),
    ]);
    const { signature } = await signMessage(nonce);
    const userObj = await Parse.Cloud.run('storePublicAddress', {
      signature: signature,
      type: 'metamask',
    });
    dispatch(fetch_user_profile());
    dispatch(
      user_profile_fetched({ user_profile: fetch_helpers.normalizeParseResponseData(userObj) }),
    );
    dispatch({ type: 'analytics', meta: { analytics: trackMetamaskConnected() } });
  } catch (error) {
    console.error(error);
    if (error.showToUser) {
      dispatch({
        type: 'METAMASK_ERROR',
        payload: {
          message: error.message,
        },
      });
    }
  }
};

export const ledgerSignData = () => async dispatch => {
  dispatch({ type: 'LEDGER_ERROR', payload: {} });

  try {
    const [{ ledgerSignMessage }, { nonce }] = await Promise.all([
      import('../../libs/web3-utils'),
      Parse.Cloud.run('getNonceForUser'),
    ]);
    const { signature } = await ledgerSignMessage(nonce);
    const userObj = await Parse.Cloud.run('storePublicAddress', {
      signature: signature,
      type: 'ledger',
    });
    dispatch(fetch_user_profile());
    dispatch(
      user_profile_fetched({ user_profile: fetch_helpers.normalizeParseResponseData(userObj) }),
    );
    dispatch({ type: 'analytics', meta: { analytics: trackLedgerConnected() } });
  } catch (error) {
    if (error.showToUser) {
      dispatch({
        type: 'LEDGER_ERROR',
        payload: {
          message: error.message,
        },
      });
    }
  }
};
