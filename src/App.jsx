import { Routes, Route, Navigate } from 'react-router-dom'
import { PlanProvider } from './context/PlanContext'
import Home from './pages/Home'
import Loading from './pages/Loading'
import WeekPlan from './pages/WeekPlan'
import RecipeDetail from './pages/RecipeDetail'
import Seasonings from './pages/Seasonings'

export default function App() {
  return (
    <PlanProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/plan" element={<WeekPlan />} />
        <Route path="/recipe/:dayIndex" element={<RecipeDetail />} />
        <Route path="/seasonings" element={<Seasonings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PlanProvider>
  )
}
