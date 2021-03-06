import { combineReducers } from 'redux';
import HomeReducer from '../scenes/home/reducers';
import AccountReducer from '../scenes/account/reducers';
import SessionsReducer from '../scenes/sessions/reducers';
import RegistrationsReducer from '../scenes/registrations/reducers';
import ResultsReducer from '../scenes/results/reducers';
import TripsReducer from '../scenes/trips/reducers';
import ServicesReducer from '../scenes/services/reducers';
import UsersReducer from '../scenes/users/reducers';
import ServiceUpsert from '../scenes/service-upsert/reducers';
import CheckoutReducer from '../scenes/checkout/reducers';

const combineFlat = reducers => (state, action) =>
  reducers.reduce((newState, reducer) => reducer(newState, action), state);

const allReducers = combineReducers({
  HomeReducer,
  SessionsReducer,
  RegistrationsReducer,
  ResultsReducer,
  TripsReducer: combineFlat([TripsReducer, CheckoutReducer]),
  ServicesReducer,
  UsersReducer,
  AccountReducer,
  ServiceUpsert,
});

export default allReducers;
