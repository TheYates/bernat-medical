import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Drug {
  id: string;
  genericName: string;
  brandName: string;
  form: string;
  strength: string;
  salePricePerUnit: number;
  stock: number;
}

interface CartItem extends Drug {
  quantity: number;
}

const paymentMethods = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'mobile', label: 'Mobile Money' },
  { id: 'insurance', label: 'Insurance' },
];

export function POSTab() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [isLoadingDrugs, setIsLoadingDrugs] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + (item.salePricePerUnit * item.quantity), 0);

  const searchDrugs = async (search: string) => {
    if (!search) return;
    
    setIsLoadingDrugs(true);
    try {
      const response = await api.get(`/drugs/search?q=${search}`);
      setDrugs(response.data);
    } catch (error) {
      toast.error("Failed to search drugs");
    } finally {
      setIsLoadingDrugs(false);
    }
  };

  const addToCart = (drug: Drug) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === drug.id);
      if (existing) {
        return prev.map(item =>
          item.id === drug.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...drug, quantity: 1 }];
    });
    setSelectedDrug(null);
    setOpen(false);
  };

  const updateQuantity = (drugId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === drugId) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return item;
        if (newQuantity > item.stock) {
          toast.error("Quantity exceeds available stock");
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (drugId: string) => {
    setCart(prev => prev.filter(item => item.id !== drugId));
  };

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethods(prev => {
      const isSelected = prev.includes(method);
      if (isSelected) {
        const newMethods = prev.filter(m => m !== method);
        const { [method]: _, ...rest } = paymentAmounts;
        setPaymentAmounts(rest);
        return newMethods;
      }
      return [...prev, method];
    });
  };

  const handlePaymentAmountChange = (method: string, amount: string) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [method]: parseFloat(amount) || 0
    }));
  };

  const handlePaymentSubmit = async () => {
    const totalPaid = Object.values(paymentAmounts).reduce((sum, amount) => sum + amount, 0);
    
    if (Math.abs(totalPaid - totalAmount) > 0.01) {
      toast.error("Total payment amount must equal the total price");
      return;
    }

    try {
      await api.post('/sales', {
        items: cart.map(item => ({
          drugId: item.id,
          quantity: item.quantity,
          pricePerUnit: item.salePricePerUnit
        })),
        payments: paymentAmounts
      });

      toast.success("Sale completed successfully");
      setShowPaymentDialog(false);
      setCart([]);
      setSelectedPaymentMethods([]);
      setPaymentAmounts({});
    } catch (error) {
      toast.error("Failed to process sale");
    }
  };

  return (
    <div className="grid grid-cols-[2fr,1fr] gap-4">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedDrug ? selectedDrug.genericName : "Search drugs..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search drugs..." 
                    onValueChange={searchDrugs}
                  />
                  {isLoadingDrugs ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>No drugs found.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-72">
                          {drugs.map((drug) => (
                            <CommandItem
                              key={drug.id}
                              onSelect={() => addToCart(drug)}
                              className="flex justify-between items-center"
                            >
                              <div>
                                <p>{drug.genericName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {drug.strength} {drug.form}
                                </p>
                              </div>
                              <div className="text-right">
                                <p>{formatCurrency(drug.salePricePerUnit)}</p>
                                <p className="text-sm text-muted-foreground">
                                  Stock: {drug.stock}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {cart.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.genericName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.strength} {item.form}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(item.salePricePerUnit)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(item.salePricePerUnit * item.quantity)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Card className="h-fit">
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            disabled={cart.length === 0}
            onClick={() => setShowPaymentDialog(true)}
          >
            Proceed to Payment
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Total Amount: {formatCurrency(totalAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={method.id}
                    checked={selectedPaymentMethods.includes(method.id)}
                    onCheckedChange={() => handlePaymentMethodChange(method.id)}
                  />
                  <label htmlFor={method.id}>{method.label}</label>
                </div>
              ))}
            </div>

            {selectedPaymentMethods.length > 0 && (
              <div className="space-y-4">
                {selectedPaymentMethods.map((method) => (
                  <div key={method} className="grid gap-2">
                    <label className="text-sm font-medium">
                      {paymentMethods.find(m => m.id === method)?.label} Amount
                    </label>
                    <Input
                      type="number"
                      value={paymentAmounts[method] || ''}
                      onChange={(e) => handlePaymentAmountChange(method, e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                ))}

                <div className="text-sm text-muted-foreground">
                  Remaining: {formatCurrency(
                    totalAmount - Object.values(paymentAmounts).reduce((sum, amount) => sum + amount, 0)
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentSubmit}>
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 