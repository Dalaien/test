import {Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Query} from '@nestjs/common';
import { MonumentsService } from './monuments.service';

@Controller('monuments')
export class MonumentsController {
    constructor(private readonly monumentsService: MonumentsService) {}

    @Get()
    async findAll(
        @Query('ville') ville?: string,
        @Query('date') date?: string,
        @Query('type') type?: string,
        @Query('id') id?: string,
        @Query('lat') lat?: string,
        @Query('lon') lon?: string,
        @Query('radius') radius?: string
    ) {
        const dateNumber = date ? parseInt(date) : undefined;
        const latNumber = lat ? parseFloat(lat) : undefined;
        const lonNumber = lon ? parseFloat(lon) : undefined;
        const radiusNumber = radius ? parseFloat(radius) : 0;
        return await this.monumentsService.getAllMonuments(ville, dateNumber, type, id, latNumber, lonNumber, radiusNumber);
    }
    @Get('/type')
    async getTypes() {
        return await this.monumentsService.getMonumentTypes();
    }
//Si l'user est authentifié: utilisation du User id
    @Post('/best-monument/:id')
    async addToFavorites(
        @Param('id') id: string,
        @Query('userId') userId: string
    ) {
        if (!userId) {
            throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
        }
        return await this.monumentsService.addFavorite(id, userId);
    }

//Si l'user n'est pas authentifié
//     @Post('/best-monument/:id')
//     async addToFavorites(@Param('id') id: string) {
//         return await this.monumentsService.addFavorite(id);
//     }
}