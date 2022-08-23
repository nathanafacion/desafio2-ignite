import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

const ADD_INVALID_PRODUCT = -1;
const ADD_WITHOUT_STOCK = -2;
const REMOVE_INVALID_PRODUCT = -3;
const UPDATE_INVALID_STOCK = -4;
const UPDATE_PRODUCT_INVALID = -5;

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const checkStocks = async (productId: number, amount: number) => {
    const hasStock = await api
      .get("stock/" + productId)
      .then((response: { data: Stock }) => {
        return response?.data?.amount > amount;
      })
      .catch((e) => {
        toast.error("Erro na adição do produto");
      });
    return hasStock;
  };

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find((p) => p.id === productId);

      if (product) {
        const updateAmount = product.amount + 1;
        updateProductAmount({ productId, amount: updateAmount });
      } else {
        api
          .get("products/" + productId)
          .then((response: { data: Product }) => {
            if (!response?.data) throw ADD_INVALID_PRODUCT;

            const hasStock = checkStocks(productId, 1);
            if (!hasStock) throw ADD_WITHOUT_STOCK;
            const newCart = [...cart, { ...response.data, amount: 1 }];
            setCart(newCart);
            localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
          })
          .catch((e) => {
            toast.error("Erro na adição do produto");
          });
      }
    } catch (e) {
      if (e === ADD_WITHOUT_STOCK) {
        toast.error("Quantidade solicitada fora de estoque");
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const filterCart = cart.filter((p) => p.id !== productId);

      if (filterCart.length === cart.length) throw REMOVE_INVALID_PRODUCT;

      setCart([...filterCart]);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(filterCart));
    } catch (e) {
      if (e === REMOVE_INVALID_PRODUCT) {
        toast.error("Erro na remoção do produto");
      }
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find((p) => p.id === productId);
      const updateAmount = amount;

      if (!product || updateAmount < 1) throw UPDATE_PRODUCT_INVALID;

      const hasStock = await checkStocks(productId, updateAmount);

      if (!hasStock) throw UPDATE_INVALID_STOCK;

      const newCart = cart.map((p) => {
        return p.id === productId ? { ...p, amount: updateAmount } : p;
      });
      setCart(newCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (e) {
      if (e === UPDATE_INVALID_STOCK) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        toast.error("Erro na alteração de quantidade do produto");
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
