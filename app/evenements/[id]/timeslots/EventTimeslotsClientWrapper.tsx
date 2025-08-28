'use client';
import dynamic from 'next/dynamic';

// Client-only dynamic import of EventTimeslotsClient
const EventTimeslotsClient = dynamic(() => import('./EventTimeslotsClient'), { ssr: false });
export default EventTimeslotsClient;
