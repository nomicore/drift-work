import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ChatPanel from './components/ChatPanel'
import ProductListing from './pages/ProductListing'
import ProductDetail from './pages/ProductDetail'
import { StoreProvider } from './context/StoreContext'

function App() {
  return (
    <StoreProvider>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<ProductListing />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
        <Footer />
        <ChatPanel />
      </div>
    </StoreProvider>
  )
}

export default App
