import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { readFileSync, writeFileSync, existsSync } from 'fs';
@Injectable()
export class MonumentsService {
    private favoritesFilePath = 'data/favorites.json';

    // Récupère les données des monuments depuis les url fourni
    private async fetchMonuments(apiUrl: string): Promise<any[]> {
        try {
            const response = await axios.get(apiUrl);
            const data = response.data.results;

            const isLille = apiUrl.includes('monuments-historiques-lille');
            const isRoubaix = apiUrl.includes('liste-monuments-historiques-de-roubaix');
            const isArmentiere = apiUrl.includes('monuments-historiques-armentieres');

            // Normalise les coordonnées géographiques en fonction de la ville
            const normalizedCoordinates = (item, isLille, isRoubaix, isArmentiere) => {
                if (isArmentiere) return item.coordonnees_geographiques;
                if (isLille) {
                    const [lat, lon] = item.coord_geo.split(',').map(Number);
                    return { lat, lon };
                }
                if (isRoubaix) return item.geo_point_2d;
                return undefined;
            };

// Filtrer et structurer les données récupérées
            const filteredData = data.map(item => ({
                id: isLille ? item.id_merimee : isRoubaix ? item.monum_his_com_id : undefined,
                coordonnees_geographiques: normalizedCoordinates(item, isLille, isRoubaix, isArmentiere),
                type: isLille? item.edifice : item.appellation_courante,
                ville: item.commune,
                date: item.datation_bati_lmcu,
            }));
            return filteredData;
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    // Récupère tous les monuments en fonction des paramètres fournis
    public async getAllMonuments(ville?: string, date?: number, type?: string, id?: string, lat?: number, lon?: number, radius?: number): Promise<any[]> {
        let baseUrls = [
            'https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/monuments-historiques-armentieres/records',
            'https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/monuments-historiques-lille/records',
            'https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/liste-monuments-historiques-de-roubaix/records'
        ];

        baseUrls = baseUrls.map(baseUrl => {
            let queryParameters = [];

            if (id) {
                if (baseUrl.includes('monuments-historiques-lille')) {
                    queryParameters.push(`id_merimee=${id}`);
                } else {
                    queryParameters.push(`monum_his_com_id='${id}'`);
                }
            }

            // Construction des paramètres de requête en fonction des critères fournis
            if (ville) {
                queryParameters.push(`commune='${ville}'`);
            }
            if (type) {
                if (baseUrl.includes('monuments-historiques-lille')) {
                    queryParameters.push(`denomination LIKE '%${type}%'`);
                } else {
                    queryParameters.push(`appellation_courante LIKE '%${type}%'`);
                }
            }
            if (date) {
                const startYear = date - 10;
                const endYear = date + 10;
                queryParameters.push(`datation_bati_lmcu>=${startYear}`);
                queryParameters.push(`datation_bati_lmcu<=${endYear}`);
            }

            const whereClause = queryParameters.length > 0 ? `?where=${queryParameters.join(' AND ')}` : '';
            return baseUrl + whereClause;
        });

        // Récupération des données de tous les URLs et fusion des résultats
        const promises = baseUrls.map(url => this.fetchMonuments(url));
        let results = (await Promise.all(promises)).flat();

        // Filtrage basé sur la géolocalisation
        if (lat !== undefined && lon !== undefined && radius !== undefined) {
            results = results.filter(item => {
                const coords = item.coordonnees_geographiques;
                if (!coords) return false;

                const distance = this.calculateDistance(lat, lon, coords.lat, coords.lon);
                return distance <= radius;
            });
        }

        return results;
    }

    public async getMonumentTypes(): Promise<string[]> {
        const baseUrls = [
            'https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/monuments-historiques-armentieres/records',
            'https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/monuments-historiques-lille/records',
            'https://opendata.lillemetropole.fr/api/explore/v2.1/catalog/datasets/liste-monuments-historiques-de-roubaix/records'
        ];
        // Obtenir une liste des types de monuments
        const promises = baseUrls.map(url => this.fetchMonuments(url));
        const allData = (await Promise.all(promises)).flat();

        const types = allData.map(item => item.type).filter((value, index, self) => self.indexOf(value) === index);

        return types;
    }

    private calculateDistance(lat1, lon1, lat2, lon2) {
        //Calcul de distance entre deux points
        const earthRadiusKm = 6371;

        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLon = this.degreesToRadians(lon2 - lon1);

        lat1 = this.degreesToRadians(lat1);
        lat2 = this.degreesToRadians(lat2);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c * 1000;
    }

    private degreesToRadians(degrees) {
        //traitement du degré
        return degrees * Math.PI / 180;
    }

    //Si l'user est authentifié
    public async addFavorite(id: string, userId: string): Promise<void> {
        // Chemin vers le fichier de favoris spécifique à l'utilisateur
        let userFavoritesFilePath = `data/favorites-${userId}.json`;
        let favorites = [];

        // Vérifie si le fichier existe déjà, sinon crée une liste vide
        if (existsSync(userFavoritesFilePath)) {
            const favoritesData = readFileSync(userFavoritesFilePath, 'utf-8');
            favorites = JSON.parse(favoritesData);
        }

        if (!favorites.includes(id)) {
            favorites.push(id);
            writeFileSync(userFavoritesFilePath, JSON.stringify(favorites));
        }
    }



    //Ajout d'un favori en partant du principe que l'user n'est pas authentifié
    // public async addFavorite(id: string): Promise<void> {
    //     let favorites = [];
    //     //1ere idée: utilisation du LocalStorage ? (A faire côté front)
    //     //2eme idée : ecriture d'un json mais n'ayant pas d'identifiant, la liste est commune à tous les user
    //     if (existsSync(this.favoritesFilePath)) {
    //         const favoritesData = readFileSync(this.favoritesFilePath, 'utf-8');
    //         favorites = JSON.parse(favoritesData);
    //     }
    //
    //     if (!favorites.includes(id)) {
    //         favorites.push(id);
    //         writeFileSync(this.favoritesFilePath, JSON.stringify(favorites));
    //     }
    // }
}