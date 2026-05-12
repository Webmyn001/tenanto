import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ListingCard from '../../components/ListingCard';
import FilterBar from '../../components/FilterBar';
import api from '../../lib/api';
import { naira } from '../../lib/format';

export default function Listings() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [averageRent, setAverageRent] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(q = router.query) {
    setLoading(true);
    try {
      const { data } = await api.get('/properties', { params: q });
      setItems(data.items); setAverageRent(data.averageRent);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (router.isReady) load(router.query); }, [router.isReady, router.query]);

  function apply(f) {
    const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    router.push({ pathname: '/listings', query: clean });
  }

  return (
    <Layout wide>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Browse housing</h1>
          {averageRent && <p className="text-sm text-gray-600">Average rent in this filter: <b>{naira(averageRent)}/yr</b></p>}
        </div>
      </div>

      <FilterBar initial={router.query} onApply={apply} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-72 animate-pulse bg-gray-100" />)
        ) : items.length ? (
          items.map((p) => <ListingCard key={p._id} p={p} />)
        ) : (
          <div className="card col-span-full text-center text-gray-500">No listings yet — try widening your filters.</div>
        )}
      </div>
    </Layout>
  );
}
