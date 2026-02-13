import { Injectable } from '@nestjs/common';
import { MercadoLivreService } from '../mercadolivre/mercadolivre.service';

@Injectable()
export class ShipmentsService {
  constructor(private readonly mlService: MercadoLivreService) {}

  async findOne(userId: string, shipmentId: string) {
    return this.mlService.getShipment(userId, shipmentId);
  }
}
