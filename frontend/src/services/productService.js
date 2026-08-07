/**
 * Product and Golden Reference management services.
 */
import { api } from "./api.js";

export async function getProducts() {
  return await api.get("/products");
}

export async function createProduct(productData) {
  return await api.post("/products", productData);
}

export async function uploadGoldenReference(productId, formData) {
  return await api.post(`/products/${productId}/golden`, formData);
}
