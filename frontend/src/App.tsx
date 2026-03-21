import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import LivingIndex from './pages/LivingIndex'
import Prices from './pages/Prices'
import Supply from './pages/Supply'
import Economy from './pages/Economy'
import RegionCompare from './pages/RegionCompare'
import Population from './pages/Population'
import Admin from './pages/Admin'
import TopMovers from './pages/TopMovers'
import MultiChart from './pages/MultiChart'
import ChargingIndex from './pages/ChargingIndex'
import Heatmap from './pages/Heatmap'
import MetroMap from './pages/MetroMap'
import NationalMap from './pages/NationalMap'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="living" element={<LivingIndex />} />
          <Route path="prices" element={<Prices />} />
          <Route path="supply" element={<Supply />} />
          <Route path="economy" element={<Economy />} />
          <Route path="regions" element={<RegionCompare />} />
          <Route path="population" element={<Population />} />
          <Route path="top-movers" element={<TopMovers />} />
          <Route path="multi-chart" element={<MultiChart />} />
          <Route path="charging" element={<ChargingIndex />} />
          <Route path="heatmap" element={<Heatmap />} />
          <Route path="metro-map" element={<MetroMap />} />
          <Route path="national-map" element={<NationalMap />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
