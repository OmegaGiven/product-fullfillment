import type { OrderSyncService } from "../interfaces";

import type { LocalStorageService } from "./localStorageService";
import { seededOrders } from "./seedData";

export class LocalOrderSyncService implements OrderSyncService {
  constructor(private storageService: LocalStorageService) {}

  async syncOrders() {
    await this.storageService.saveOrders(seededOrders);
    return this.storageService.listOrders();
  }
}
