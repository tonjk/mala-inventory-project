import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, AlertCircle, CheckCircle, Calculator } from 'lucide-react';

// Interfaces
interface InventoryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  avgDailyUsage: number;
  maxDailyUsage: number;
  leadTime: number; // Days to receive goods
  currentStock: number;
}

// Initial Data for a Mala Restaurant


export default function MalaInventoryApp() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'Meat',
    unit: 'kg',
    avgDailyUsage: 0,
    maxDailyUsage: 0,
    leadTime: 1,
    currentStock: 0
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      if (data.message === 'success') {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  // Calculate Safety Stock
  // Formula: (Max Daily Usage * Max Lead Time) - (Avg Daily Usage * Avg Lead Time)
  // For simplicity here, we assume Lead Time is static, so:
  // Safety Stock = (Max Daily Usage * Lead Time) - (Avg Daily Usage * Lead Time) + Buffer
  // A robust formula for small biz: (Max Daily Usage * Lead Time) - (Avg Daily Usage * Lead Time)
  const calculateSafetyStock = (item: InventoryItem) => {
    // Safety Stock formula: (Max Daily Usage * Lead Time) - (Avg Daily Usage * Lead Time)
    // This covers the variance in demand during the lead time.
    const safetyStock = (item.maxDailyUsage * item.leadTime) - (item.avgDailyUsage * item.leadTime);
    return Math.max(0, parseFloat(safetyStock.toFixed(2))); // Ensure not negative
  };

  const calculateReorderPoint = (item: InventoryItem) => {
    // Reorder Point = (Avg Daily Usage * Lead Time) + Safety Stock
    const safetyStock = calculateSafetyStock(item);
    const demandDuringLeadTime = item.avgDailyUsage * item.leadTime;
    return parseFloat((demandDuringLeadTime + safetyStock).toFixed(2));
  };

  const getStatus = (item: InventoryItem) => {
    const reorderPoint = calculateReorderPoint(item);
    if (item.currentStock <= reorderPoint) {
      return { status: 'Reorder Now', color: 'text-red-600 bg-red-100', icon: <AlertCircle className="w-4 h-4 mr-1" /> };
    }
    return { status: 'OK', color: 'text-green-600 bg-green-100', icon: <CheckCircle className="w-4 h-4 mr-1" /> };
  };

  const handleAddItem = async () => {
    if (!newItem.name) return;
    const item = {
      name: newItem.name || 'New Item',
      category: newItem.category || 'General',
      unit: newItem.unit || 'unit',
      avgDailyUsage: Number(newItem.avgDailyUsage),
      maxDailyUsage: Number(newItem.maxDailyUsage),
      leadTime: Number(newItem.leadTime),
      currentStock: Number(newItem.currentStock),
    };

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });
      const data = await response.json();
      if (data.message === 'success') {
        fetchItems(); // Refresh list
        setNewItem({ name: '', category: 'Meat', unit: 'kg', avgDailyUsage: 0, maxDailyUsage: 0, leadTime: 1, currentStock: 0 });
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.message === 'deleted') {
        setItems(items.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleUpdate = async (id: number, field: keyof InventoryItem, value: any) => {
    // Optimistic update
    const originalItems = [...items];
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));

    try {
      await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error('Error updating item:', error);
      setItems(originalItems); // Revert on error
    }
  };

  const exportToCSV = () => {
    const headers = "Name,Category,Unit,Avg Daily Usage,Max Daily Usage,Lead Time (Days),Current Stock,Safety Stock,Reorder Point,Status\n";
    const rows = items.map(item => {
      const ss = calculateSafetyStock(item);
      const rop = calculateReorderPoint(item);
      const status = item.currentStock <= rop ? 'Reorder Now' : 'OK';
      return `${item.name},${item.category},${item.unit},${item.avgDailyUsage},${item.maxDailyUsage},${item.leadTime},${item.currentStock},${ss},${rop},${status}`;
    }).join("\n");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mala_inventory_stock.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <Calculator className="w-8 h-8" />
              ระบบคำนวณสต็อกร้านหม่าล่า (Mala Inventory)
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage daily usage, safety stock, and reorder points.</p>
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export to Excel (.csv)
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-slate-700">เพิ่มรายการสินค้า (Add New Item)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input 
              type="text" 
              placeholder="ชื่อวัตถุดิบ (Item Name)" 
              className="border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
            />
            <select 
              className="border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              value={newItem.category}
              onChange={(e) => setNewItem({...newItem, category: e.target.value})}
            >
              <option value="Meat">เนื้อสัตว์ (Meat)</option>
              <option value="Veggie">ผัก (Veggie)</option>
              <option value="Sauce">เครื่องปรุง/น้ำซุป (Sauce/Soup)</option>
              <option value="Topping">ลูกชิ้น/เต้าหู้ (Topping)</option>
              <option value="Supplies">ของใช้ (Supplies)</option>
            </select>
            <input 
              type="text" 
              placeholder="หน่วย (Unit eg. kg, pack)" 
              className="border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
              value={newItem.unit}
              onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
            />
             <div className="flex gap-2">
                <input 
                type="number" 
                placeholder="Current Stock" 
                className="border p-2 rounded w-full focus:ring-2 focus:ring-red-500 outline-none"
                value={newItem.currentStock || ''}
                onChange={(e) => setNewItem({...newItem, currentStock: Number(e.target.value)})}
                />
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">การใช้เฉลี่ยต่อวัน (Avg Daily Usage)</label>
              <input 
                type="number" 
                placeholder="0" 
                className="border p-2 rounded w-full focus:ring-2 focus:ring-red-500 outline-none"
                value={newItem.avgDailyUsage || ''}
                onChange={(e) => setNewItem({...newItem, avgDailyUsage: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">การใช้สูงสุดต่อวัน (Max Daily Usage)</label>
              <input 
                type="number" 
                placeholder="0" 
                className="border p-2 rounded w-full focus:ring-2 focus:ring-red-500 outline-none"
                value={newItem.maxDailyUsage || ''}
                onChange={(e) => setNewItem({...newItem, maxDailyUsage: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">ระยะเวลารอของ (Lead Time: Days)</label>
              <input 
                type="number" 
                placeholder="1" 
                className="border p-2 rounded w-full focus:ring-2 focus:ring-red-500 outline-none"
                value={newItem.leadTime || ''}
                onChange={(e) => setNewItem({...newItem, leadTime: Number(e.target.value)})}
              />
            </div>
          </div>

          <button 
            onClick={handleAddItem}
            className="mt-4 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Avg Usage<br/><span className="text-xs text-slate-500">(Daily)</span></th>
                  <th className="p-4 text-center">Max Usage<br/><span className="text-xs text-slate-500">(Daily)</span></th>
                  <th className="p-4 text-center">Lead Time<br/><span className="text-xs text-slate-500">(Days)</span></th>
                  <th className="p-4 text-center bg-blue-50">Current Stock</th>
                  <th className="p-4 text-center bg-yellow-50">Safety Stock<br/><span className="text-xs text-slate-500">(Calc)</span></th>
                  <th className="p-4 text-center bg-red-50">Reorder Point<br/><span className="text-xs text-slate-500">(Calc)</span></th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const safetyStock = calculateSafetyStock(item);
                  const reorderPoint = calculateReorderPoint(item);
                  const { status, color, icon } = getStatus(item);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">
                         <input 
                            value={item.name} 
                            onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 outline-none w-full"
                         />
                      </td>
                      <td className="p-4 text-slate-500">{item.category}</td>
                      <td className="p-4 text-center">
                        <input 
                            type="number"
                            value={item.avgDailyUsage} 
                            onChange={(e) => handleUpdate(item.id, 'avgDailyUsage', Number(e.target.value))}
                            className="w-16 text-center bg-slate-50 border rounded p-1"
                         />
                      </td>
                      <td className="p-4 text-center">
                        <input 
                            type="number"
                            value={item.maxDailyUsage} 
                            onChange={(e) => handleUpdate(item.id, 'maxDailyUsage', Number(e.target.value))}
                            className="w-16 text-center bg-slate-50 border rounded p-1"
                         />
                      </td>
                      <td className="p-4 text-center">
                         <input 
                            type="number"
                            value={item.leadTime} 
                            onChange={(e) => handleUpdate(item.id, 'leadTime', Number(e.target.value))}
                            className="w-12 text-center bg-slate-50 border rounded p-1"
                         />
                      </td>
                      <td className="p-4 text-center bg-blue-50 font-bold text-blue-700">
                        <div className="flex items-center justify-center gap-1">
                           <input 
                            type="number"
                            value={item.currentStock} 
                            onChange={(e) => handleUpdate(item.id, 'currentStock', Number(e.target.value))}
                            className="w-16 text-center bg-white border border-blue-200 rounded p-1"
                           />
                           <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center bg-yellow-50 text-yellow-700 font-semibold">
                        {safetyStock} <span className="text-xs font-normal">{item.unit}</span>
                      </td>
                      <td className="p-4 text-center bg-red-50 text-red-700 font-bold">
                        {reorderPoint} <span className="text-xs font-normal">{item.unit}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
                          {icon} {status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      No items yet. Add one above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend / Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
           <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-2">วิธีใช้งาน (How to use)</h3>
              <ul className="list-disc list-inside space-y-1">
                 <li>กรอก <strong>การใช้เฉลี่ย (Avg Usage)</strong> และ <strong>การใช้สูงสุด (Max Usage)</strong> ตามจริง</li>
                 <li>กรอก <strong>Lead Time</strong> (จำนวนวันที่ต้องรอของหลังจากสั่ง)</li>
                 <li>อัปเดต <strong>Current Stock</strong> ทุกสิ้นวันเพื่อดูสถานะ</li>
                 <li>กดปุ่ม <strong>Export to Excel</strong> เพื่อนำข้อมูลไปส่งต่อหรือปริ้นท์</li>
              </ul>
           </div>
           <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-2">สูตรคำนวณ (Formula)</h3>
              <div className="space-y-2">
                 <p><strong>Safety Stock (สต็อกกันเหนียว):</strong> <br/><code>(Max Usage × Lead Time) - (Avg Usage × Lead Time)</code></p>
                 <p><strong>Reorder Point (จุดสั่งซื้อ):</strong> <br/><code>(Avg Usage × Lead Time) + Safety Stock</code></p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}