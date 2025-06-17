import { useState } from "react";
import { X, Minus, Plus, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface ModernCartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
  storePath: string;
}

const ModernCartSidebar = ({ isOpen, onClose, primaryColor, storePath }: ModernCartSidebarProps) => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const [couponCode, setCouponCode] = useState("");

  const subtotal = getCartTotal();
  const tax = Math.round(subtotal * 0.16); // 16% VAT
  const total = subtotal + tax;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Cart Modal */}
      <div className="fixed right-2 top-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-xl z-50 flex flex-col sm:right-4 sm:top-4 sm:w-80" style={{ maxHeight: 'calc(100vh - 1rem)', height: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="font-medium">Back</span>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-center space-x-3 py-3 border-b border-gray-100">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.product.image_url || "/api/placeholder/64/64"}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Coach</p>
                        <p className="text-gray-600 text-sm">{item.product.name}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quantity and Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="font-semibold text-gray-900">
                        KES {(item.product.price * item.quantity).toLocaleString('en-KE')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">KES {subtotal.toLocaleString('en-KE')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">KES {tax.toLocaleString('en-KE')}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span>KES {total.toLocaleString('en-KE')}</span>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Apply Coupon Code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="px-4 text-sm font-medium"
                >
                  CHECK
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full text-white font-medium py-3"
                style={{ backgroundColor: primaryColor }}
                asChild
              >
                <Link to={`${storePath}/checkout`} onClick={onClose}>
                  Place Order
                </Link>
              </Button>
              <button
                onClick={onClose}
                className="w-full text-center text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ModernCartSidebar; 