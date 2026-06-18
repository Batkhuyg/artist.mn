import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import FloatingBasket from './components/FloatingBasket.tsx'
import Home from './pages/Home.tsx'
import ProductDetail from './pages/ProductDetail.tsx'
import AlbumDetail from './pages/AlbumDetail.tsx'
import ArtistDetail from './pages/ArtistDetail.tsx'
import Basket from './pages/Basket.tsx'
import Checkout from './pages/Checkout.tsx'
import Profile from './pages/Profile.tsx'
import OrderDetail from './pages/OrderDetail.tsx'
import LoginModal from './components/LoginModal.tsx'

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/album/:id" element={<AlbumDetail />} />
          <Route path="/artist/:id" element={<ArtistDetail />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/order/:id" element={<OrderDetail />} />
        </Routes>
      </main>
      <Footer />
      <FloatingBasket />
      <LoginModal />
    </div>
  )
}
