import { useState, useMemo, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Minus,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Drug } from "@/types/drug";
import { PaymentDialog } from "@/components/shared/payment-dialog";
import { format, parseISO } from "date-fns";

interface CartItem extends Drug {
  quantity: number;
}

const paymentMethods = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "mobile", label: "Mobile Money" },
  { id: "insurance", label: "Insurance" },
];

// Add a function to ensure price exists
const getDrugPrice = (drug: Drug) => {
  return drug.pos_price;
};

interface SaleItem {
  id: number;
  drug_id: number;
  quantity: number;
  price_per_unit: number;
  name: string;
  strength: string;
  unit: string;
}

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  created_by: string;
  items: SaleItem[];
  payments: {
    payment_method: string;
    amount: number;
  }[];
}

// Add helper function for payment icons
const getPaymentIcon = (method: string) => {
  const methodLower = method.toLowerCase();
  if (methodLower.includes("cash")) return <Banknote className="h-4 w-4" />;
  if (methodLower.includes("card")) return <CreditCard className="h-4 w-4" />;
  if (methodLower.includes("mobile")) return <Smartphone className="h-4 w-4" />;
  if (methodLower.includes("insurance")) return <Shield className="h-4 w-4" />;
  return <CreditCard className="h-4 w-4" />; // default
};

export function POSTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingDrugs, setIsLoadingDrugs] = useState(false);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    string[]
  >([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>(
    {}
  );
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [todaysSummary, setTodaysSummary] = useState<{
    totalTransactions: number;
    totalSales: number;
    paymentMethods: { method: string; total: number }[];
  }>({
    totalTransactions: 0,
    totalSales: 0,
    paymentMethods: [],
  });

  const totalAmount = cart.reduce(
    (sum, item) => sum + getDrugPrice(item) * item.quantity,
    0
  );

  const filteredDrugs = useMemo(() => {
    return drugs.filter((drug) => {
      const searchLower = searchTerm.toLowerCase();
      return drug.name.toLowerCase().includes(searchLower);
    });
  }, [searchTerm, drugs]);

  useEffect(() => {
    const fetchDrugs = async () => {
      setIsLoadingDrugs(true);
      try {
        const response = await api.get("/drugs/active");
        const drugs = response.data.map((drug: any) => ({
          ...drug,
          pos_price: parseFloat(drug.pos_price) || 0,
          min_stock: drug.min_stock,
        }));
        console.log("Fetched drugs:", drugs); // Debug log
        setDrugs(drugs);
      } catch (error) {
        console.error("Error loading drugs:", error);
        toast.error("Failed to load drugs");
      } finally {
        setIsLoadingDrugs(false);
      }
    };
    fetchDrugs();
  }, []);

  const addToCart = (drug: Drug) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === drug.id);
      if (existing) {
        return prev.map((item) =>
          item.id === drug.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...drug, quantity: 1 }];
    });
    setSelectedDrug(null);
    setOpen(false);
  };

  const updateQuantity = (drugId: string, change: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === Number(drugId)) {
          const newQuantity = item.quantity + change;
          if (newQuantity < 1) return item;
          if (newQuantity > item.stock) {
            toast.error("Quantity exceeds available stock");
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (drugId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== drugId));
  };

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethods((prev) => {
      const isSelected = prev.includes(method);
      if (isSelected) {
        const newMethods = prev.filter((m) => m !== method);
        const { [method]: _, ...rest } = paymentAmounts;
        setPaymentAmounts(rest);
        return newMethods;
      }
      return [...prev, method];
    });
  };

  const handlePaymentAmountChange = (method: string, amount: string) => {
    setPaymentAmounts((prev) => ({
      ...prev,
      [method]: parseFloat(amount) || 0,
    }));
  };

  const handlePaymentSubmit = async (data: {
    methods: string[];
    amounts: Record<string, number>;
  }) => {
    try {
      const saleData = {
        items: cart.map((item) => ({
          drugId: item.id,
          quantity: item.quantity,
          pricePerUnit: getDrugPrice(item),
        })),
        payments: data.methods.map((method) => ({
          payment_method: method,
          amount: data.amounts[method],
        })),
      };

      console.log("Sending sale data:", saleData); // Debug log

      await api.post("/sales", saleData);

      toast.success("Sale completed successfully");
      setShowPaymentDialog(false);
      setCart([]);
      fetchTodaysSummary(); // Refresh the summary after successful sale
    } catch (error) {
      console.error("Sale error:", error);
      toast.error("Failed to process sale");
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const response = await api.get("/sales");
      setSalesHistory(response.data);
    } catch (error) {
      console.error("Error fetching sales history:", error);
      toast.error("Failed to fetch sales history");
    }
  };

  const fetchTodaysSummary = async () => {
    try {
      const response = await api.get("/sales/today");
      setTodaysSummary(response.data);
    } catch (error) {
      console.error("Error fetching today's summary:", error);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchSalesHistory();
    }
  }, [showHistory]);

  useEffect(() => {
    fetchTodaysSummary();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm text-muted-foreground">
                Total Transactions
              </span>
              <span className="text-2xl font-bold">
                {todaysSummary.totalTransactions}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm text-muted-foreground">Total Sales</span>
              <span className="text-2xl font-bold">
                {formatCurrency(todaysSummary.totalSales)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {showHistory ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold">Sales History</h3>
                  <p className="text-sm text-muted-foreground">
                    View all completed sales
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowHistory(false)}>
                  ← Back to POS
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Payment Methods</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesHistory.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {format(parseISO(sale.created_at), "d MMM yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(sale.created_at), "h:mm a")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {sale.items.map((item) => (
                            <div key={item.id}>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-extrabold">
                                  {item.quantity}{" "}
                                </span>{" "}
                                × {formatCurrency(item.price_per_unit)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {sale.payments.map((payment, index) => (
                            <div
                              key={`payment-${index}`}
                              className="flex items-center gap-2"
                            >
                              {getPaymentIcon(payment.payment_method)}
                              <div className="flex flex-col">
                                <p className="text-sm font-medium">
                                  {payment.payment_method}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatCurrency(payment.amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{sale.created_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Point of Sale</h3>
                  <p className="text-sm text-muted-foreground">
                    Process sales transactions
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowHistory(true)}>
                  View History →
                </Button>
              </div>

              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[350px] justify-between"
                  >
                    <Input
                      placeholder="Search medications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-0 focus-visible:ring-0"
                    />
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={
                        isLoadingDrugs ? "Loading..." : "Search medications..."
                      }
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                      disabled={isLoadingDrugs}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingDrugs
                          ? "Loading medications..."
                          : "No drugs found."}
                      </CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-72">
                          {filteredDrugs.map((drug) => (
                            <CommandItem
                              key={drug.id}
                              onSelect={() => {
                                addToCart(drug);
                                setOpen(false);
                                setSearchTerm("");
                              }}
                              className="flex justify-between items-center"
                            >
                              <div>
                                <p>{drug.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {drug.strength}
                                  {drug.unit} • {formatCurrency(drug.pos_price)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p
                                  className={cn(
                                    "text-sm",
                                    drug.stock === 0 ? "text-destructive" : "",
                                    drug.stock > 0 &&
                                      drug.stock <= drug.min_stock
                                      ? "text-yellow-500"
                                      : "",
                                    drug.stock > drug.min_stock
                                      ? "text-green-500"
                                      : ""
                                  )}
                                >
                                  {drug.stock}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.length > 0 ? (
                      cart.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.strength} {item.unit}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(getDrugPrice(item))}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "text-sm",
                                item.stock === 0 ? "text-destructive" : "",
                                item.stock > 0 && item.stock <= item.min_stock
                                  ? "text-yellow-500"
                                  : "",
                                item.stock > item.min_stock
                                  ? "text-green-500"
                                  : ""
                              )}
                            >
                              {item.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(item.id.toString(), -1)
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(item.id.toString(), 1)
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(getDrugPrice(item) * item.quantity)}
                          </TableCell>
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-6 text-muted-foreground"
                        >
                          No items in cart
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="border rounded-lg p-4 bg-muted space-y-4">
                  <h3 className="font-semibold">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-fit"
                    disabled={cart.length === 0}
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </div>

              <PaymentDialog
                open={showPaymentDialog}
                onOpenChange={setShowPaymentDialog}
                totalAmount={totalAmount}
                onSubmit={handlePaymentSubmit}
                summary={{
                  title: "Cart Summary",
                  items: cart.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    amount: getDrugPrice(item) * item.quantity,
                  })),
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
