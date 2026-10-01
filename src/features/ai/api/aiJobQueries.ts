import { useLiveQuery } from 'dexie-react-hooks'
import { countTodayJobs } from './aiJobRepo'

export const useTodayJobCount = () => useLiveQuery(countTodayJobs)
