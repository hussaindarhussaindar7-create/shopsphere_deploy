import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const money = (n) => `Rs ${n.toLocaleString()}`;

export default function App() {
  const [view, setView] = useState('shop');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState({}); // { productId: { product, qty } }
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (getToken()) api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null));
  }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const count = Object.values(cart).reduce((s, i) => s + i.qty, 0);

  return (
    <div className="wrap">
      <header>
        <h1>ShopSphere</h1>
        <nav>
          <button onClick={() => setView('shop')}>Shop</button>
          <button onClick={() => setView('cart')}>Cart ({count})</button>
          {user && <button onClick={() => setView('orders')}>My orders</button>}
          {user
            ? <button onClick={() => { setToken(null); setUser(null); setCart({}); setView('shop'); }}>Log out ({user.name})</button>
            : <button onClick={() => setView('login')}>Log in</button>}
        </nav>
      </header>
      {msg && <p className="flash">{msg}</p>}
      {view === 'shop' && <Shop cart={cart} setCart={setCart} flash={flash} />}
      {view === 'cart' && <Cart cart={cart} setCart={setCart} user={user} setView={setView} flash={flash} />}
      {view === 'orders' && <Orders flash={flash} />}
      {view === 'login' && <Login onDone={(u) => { setUser(u); setView('shop'); }} flash={flash} />}
    </div>
  );
}

function Shop({ cart, setCart, flash }) {
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState('');

  const load = (search = '') =>
    api(`/products?q=${encodeURIComponent(search)}`).then((d) => setProducts(d.products)).catch((e) => flash(e.message));
  useEffect(() => { load(); }, []);

  const add = (p) => setCart((c) => ({ ...c, [p._id]: { product: p, qty: Math.min((c[p._id]?.qty || 0) + 1, p.stock) } }));

  return (
    <>
      <form className="row" onSubmit={(e) => { e.preventDefault(); load(q); }}>
        <input placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        <button>Search</button>
      </form>
      {!products && <p>Loading products…</p>}
      {products?.length === 0 && <p>No products found.</p>}
      <div className="grid">
        {products?.map((p) => (
          <div className="card" key={p._id}>
            <h3>{p.name}</h3>
            <p className="muted">{p.description}</p>
            <p><strong>{money(p.price)}</strong> · {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p>
            <button disabled={p.stock === 0 || (cart[p._id]?.qty || 0) >= p.stock} onClick={() => add(p)}>Add to cart</button>
          </div>
        ))}
      </div>
    </>
  );
}

function Cart({ cart, setCart, user, setView, flash }) {
  const items = Object.values(cart);
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const [busy, setBusy] = useState(false);

  async function checkout() {
    if (!user) { flash('Log in to place an order'); return setView('login'); }
    setBusy(true);
    try {
      const { order } = await api('/orders', { method: 'POST', body: { items: items.map((i) => ({ productId: i.product._id, qty: i.qty })) } });
      await api(`/payments/simulate/${order._id}`, { method: 'POST' }); // sandbox payment
      setCart({});
      flash('Order placed and paid (sandbox).');
      setView('orders');
    } catch (e) { flash(e.message); } finally { setBusy(false); }
  }

  if (items.length === 0) return <p>Your cart is empty. Add something from the shop.</p>;
  return (
    <>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th></th></tr></thead>
        <tbody>
          {items.map(({ product, qty }) => (
            <tr key={product._id}>
              <td>{product.name}</td><td>{qty}</td><td>{money(product.price * qty)}</td>
              <td><button onClick={() => setCart(({ [product._id]: _, ...rest }) => rest)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><strong>Total: {money(total)}</strong></p>
      <button disabled={busy} onClick={checkout}>{busy ? 'Processing…' : 'Place order and pay'}</button>
    </>
  );
}

function Orders({ flash }) {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api('/orders/mine').then((d) => setOrders(d.orders)).catch((e) => flash(e.message)); }, []);
  if (!orders) return <p>Loading orders…</p>;
  if (orders.length === 0) return <p>No orders yet.</p>;
  return (
    <table>
      <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o._id}>
            <td>{o._id.slice(-6)}</td><td>{new Date(o.createdAt).toLocaleString()}</td>
            <td>{money(o.total)}</td><td className={`status ${o.status}`}>{o.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Login({ onDone, flash }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const d = await api(`/auth/${mode}`, { method: 'POST', body });
      setToken(d.token);
      onDone(d.user);
    } catch (err) { flash(err.message); }
  }

  return (
    <form className="col" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
      {mode === 'register' && <input placeholder="Name" value={form.name} onChange={set('name')} required />}
      <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
      <input type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={set('password')} required />
      <button>{mode === 'login' ? 'Log in' : 'Register'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in'}
      </button>
    </form>
  );
}
