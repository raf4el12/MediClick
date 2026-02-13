import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { authSlice } from './slices/auth';
import { specialtiesSlice } from './slices/specialties';
import { categoriesSlice } from './slices/categories';
import { doctorsSlice } from './slices/doctors';
import { availabilitySlice } from './slices/availability';
import { schedulesSlice } from './slices/schedules';
import { usersSlice } from './slices/users';
import { patientsSlice } from './slices/patients';

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'accessToken', 'isAuthenticated'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice.reducer),
  specialties: specialtiesSlice.reducer,
  categories: categoriesSlice.reducer,
  doctors: doctorsSlice.reducer,
  availability: availabilitySlice.reducer,
  schedules: schedulesSlice.reducer,
  users: usersSlice.reducer,
  patients: patientsSlice.reducer,
});

export const makeStore = () => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }),
    devTools: process.env.NODE_ENV !== 'production',
  });

  const persistor = persistStore(store);

  return { store, persistor };
};

export type AppStore = ReturnType<typeof makeStore>['store'];
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
