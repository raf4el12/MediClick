'use client';

import { useState } from 'react';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import CustomTabList from '@core/components/mui/TabList';
import type { PatientRecord } from '../types';
import RecordAppointments from './RecordAppointments';
import RecordGeneralInfo from './RecordGeneralInfo';
import RecordMedicalHistory from './RecordMedicalHistory';

type RecordTab = 'summary' | 'history' | 'appointments';

/** Pestañas del expediente (patrón `user-right` de Materio). */
export default function RecordTabs({ record }: { record: PatientRecord }) {
  const [tab, setTab] = useState<RecordTab>('summary');

  return (
    <TabContext value={tab}>
      <div className='flex flex-col gap-6'>
        <CustomTabList
          onChange={(_, value: RecordTab) => setTab(value)}
          variant='scrollable'
          scrollButtons='auto'
          allowScrollButtonsMobile
          pill='true'
          aria-label='Secciones del expediente'
        >
          <Tab value='summary' label='Resumen' icon={<i className='ri-heart-pulse-line' aria-hidden />} iconPosition='start' />
          <Tab value='history' label='Antecedentes' icon={<i className='ri-file-list-3-line' aria-hidden />} iconPosition='start' />
          <Tab value='appointments' label='Citas' icon={<i className='ri-calendar-check-line' aria-hidden />} iconPosition='start' />
        </CustomTabList>
        <TabPanel value='summary' className='p-0'>
          <RecordGeneralInfo record={record} />
        </TabPanel>
        <TabPanel value='history' className='p-0'>
          <RecordMedicalHistory history={record.medicalHistory ?? []} />
        </TabPanel>
        <TabPanel value='appointments' className='p-0'>
          <RecordAppointments appointments={record.appointments ?? []} />
        </TabPanel>
      </div>
    </TabContext>
  );
}
