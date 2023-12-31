import {
  BadGatewayException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Contract, Provider } from 'ethers';
import { MARKET_ABI } from '../abi/MARKET.ABI';
import { MarketRepository } from './market.repository';
import { TrendsService } from '../trends/trends.service';
import { ListNftByCaDto, ListNftByEoaDto } from './dto/market.dto';
import { IListNft } from '../interface/market.interface';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ListNftTransactionDto } from './dto/transaction-market.dto';
import { NftInfoDto } from './dto/info-market.dto';
import { ERC721_ABI } from '../abi/ERC721.ABI';
import { ERC1155_ABI } from '../abi/ERC1155.ABI';
import { AddNftPlusDto } from './dto/add-market.dto';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly contract: Contract;
  private readonly PREFIX = 10 ** 18;
  private currencyPrice = 0;
  private currency = 'matic';
  constructor(
    @Inject('Provider') private readonly provider: Provider,
    private readonly httpService: HttpService,
    private readonly marketRepository: MarketRepository,
    private readonly trendService: TrendsService,
  ) {
    this.contract = new Contract(
      process.env.MARKET_CA,
      MARKET_ABI,
      this.provider,
    );
    this.changeBasicCurrency({ symbol: this.currency });
  }

  async listCollections(page: number, search?: string) {
    try {
      const response = await this.marketRepository.findAll(page, search);
      return response.map((v) => {
        return {
          ca: v.address,
          name: v.name,
          nickname: v.symbol,
          description: v.description,
          image: v.logo,
          like: v.favorite.length,
          latest: v.createdAt,
          prices: [
            {
              currency: 'KRW',
              price:
                Math.floor(v.floorPrice * this.currencyPrice * 1000) / 1000,
            },
            {
              currency: this.currency,
              price: Math.floor(v.floorPrice * 1000) / 1000,
            },
          ],
        };
      });
    } catch (error) {
      throw new InternalServerErrorException('Unable to find data', {
        cause: new Error(),
        description: 'MongoDB Error',
      });
    }
  }

  async listNftByCa({ ca }: ListNftByCaDto) {
    try {
      const result = await this.contract.getAllTokensInCollection(ca);

      return await this.listNft({ result });
    } catch (error) {
      throw new BadGatewayException('Unable to get NFTs in collection', {
        cause: new Error(),
        description: 'Contract Error',
      });
    }
  }

  async listNftByEoa({ eoa }: ListNftByEoaDto) {
    try {
      const result = await this.contract.getUserTokens(eoa);

      return await this.listNft({ result });
    } catch (error) {
      throw new BadGatewayException('Unable to get NFTs from user', {
        cause: new Error(),
        description: 'Contract Error',
      });
    }
  }

  async getMetadata({ metadata }: { metadata: string }) {
    const ifpsUrl = 'https://ipfs.io/ipfs/';
    const { data } = await firstValueFrom(
      this.httpService.get(`${ifpsUrl}${metadata.replace('ipfs://', '')}`).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw new NotFoundException('Unable to get IPFS MetaData', {
            cause: new Error(),
            description: 'IPFS Error',
          });
        }),
      ),
    );

    return {
      name: data.name,
      descrition: data.description,
      image: data.ipfs.replace('ipfs://', ifpsUrl),
    };
  }

  async listNft({ result }): Promise<IListNft[]> {
    try {
      return await Promise.all(
        result.map(async (v: string[]) => {
          const [
            marketId,
            owner,
            nftAddress,
            tokenId,
            price,
            metadata,
            isSoldOut,
          ] = v;

          const data = await this.getMetadata({ metadata });
          const krwPrice = this.trendService.krw.price;

          const prices = [
            {
              currency: 'KRW',
              price: (Number(price) / this.PREFIX) * krwPrice,
            },
            { currency: 'MATIC', price: Number(price) / this.PREFIX },
          ];

          return {
            ...data,
            marketId: Number(marketId),
            owner,
            nftAddress,
            tokenId: Number(tokenId),
            prices,
            isSoldOut,
          };
        }),
      );
    } catch (error) {
      throw new NotFoundException('Invalid Data', {
        cause: new Error(),
        description: 'Invalid Data Error',
      });
    }
  }

  async listNftTransaction({ ca, tokenId }: ListNftTransactionDto) {
    try {
      const response = await this.marketRepository.findTransaction({
        ca,
        tokenId: Number(tokenId),
      });
      const result = response.map((v) => {
        const { price, krwPrice, createdAt, updatedAt, ...rest } = v;
        return {
          ...rest,
          price: [
            { currency: 'MATIC', price: price / this.PREFIX },
            { currency: 'KRW', price: krwPrice },
          ],
          createdAt: this.customDate({ date: createdAt }),
          updatedAt: this.customDate({ date: updatedAt }),
        };
      });

      return result;
    } catch (error) {
      throw new InternalServerErrorException('Unable to get transaction data', {
        cause: new Error(),
        description: 'MongoDB Error',
      });
    }
  }

  customDate({ date }) {
    const parsedTime = new Date(Date.parse(date));
    const thisIime = new Date().getTime();

    const timeElapsed = Math.floor((thisIime - parsedTime.getTime()) / 1000);

    if (timeElapsed < 60) return '방금전';
    if (timeElapsed < 60 * 60) return `${Math.floor(timeElapsed / 60)}분 전`;
    if (timeElapsed < 60 * 60 * 24)
      return `${Math.floor(timeElapsed / (60 * 60))}시간 전`;
    if (timeElapsed < 60 * 60 * 24 * 7)
      return `${Math.floor(timeElapsed / (60 * 60 * 24))}일 전`;
    return parsedTime.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async nftInfo({ ca, tokenId }: NftInfoDto) {
    try {
      const { creator, name, symbol } = await this.marketRepository.findOne({
        ca,
      });
      if (!creator || !name || !symbol)
        throw new Error('No value found for CA');
      const response = await this.contract.getAllTokensInCollection(ca);
      const [tokenInfo] = await Promise.all(
        response
          .filter((v: string[]) => Number(v[3]) === Number(tokenId))
          .map(async (v: string[]) => {
            const owner = v[1];
            const price = Number(v[4]) / this.PREFIX;
            const isTrade = v[6];
            const { name, descrition, image } = await this.getMetadata({
              metadata: v[5],
            });
            return {
              nftName: name,
              descrition,
              image,
              owner,
              isTrade,
              price: { currency: 'MATIC', price },
              fee: { currency: 'MATIC', price: price * 0.01 },
              krw: (
                Math.floor(price * this.currencyPrice * 1000) / 1000
              ).toString(),
            };
          }),
      );

      if (!tokenInfo) throw new Error('TokenInfo is empty');

      const blockchain = {
        name: 'polygon',
        image:
          'https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png?}1624446912',
      };

      return {
        ca,
        supply: response.length,
        creator,
        symbol,
        blockchain,
        tokenId,
        tokenStandard: 'ERC721',
        collectionName: name,
        ...tokenInfo,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message, {
        cause: new Error(),
        description: 'Get NftInfo Error',
      });
    }
  }

  async changeBasicCurrency({ symbol }: { symbol: string }) {
    this.currency = symbol.toUpperCase();
    const currencyPrice = (await this.trendService.getTokenData({ symbol }))
      .price;
    if (currencyPrice === null) {
      this.currencyPrice = Math.floor(0 * 1000) / 1000;
      return '변경되었습니다.';
    }
    if (currencyPrice === null) {
      this.currencyPrice = Math.floor(0 * 1000) / 1000;
      return '변경되었습니다.';
    }
    this.currencyPrice = Math.floor(currencyPrice * 1000) / 1000;
    return '변경되었습니다.';
  }

  async addNft({ eoa, tokenStandard, ca, tokenId }: AddNftPlusDto) {
    if (tokenStandard === 'ERC721') {
      const { nftName, description, image, owner } = await this.getERC721Info({
        eoa,
        ca,
        tokenId,
      });
      return {
        name: nftName,
        description,
        image,
        marketId: 0,
        owner,
        nftAddress: ca,
        tokenId,
        prices: [
          { currency: 'KRW', price: 0 },
          { currency: 'MATIC', price: 0 },
        ],
        isSoldOut: false,
        tokenStandard,
      };
    }

    if (tokenStandard === 'ERC1155') {
      const { name, description, image } = await this.getERC1155Info({
        ca,
        tokenId,
      });
      return {
        name,
        description,
        image,
        marketId: 0,
        owner: 'unknown',
        nftAddress: ca,
        tokenId,
        prices: [
          { currency: 'KRW', price: 0 },
          { currency: 'MATIC', price: 0 },
        ],
        isSoldOut: false,
        tokenStandard,
      };
    }
  }

  async isUseIPFS(tokenUri: string) {
    try {
      const ipfsUrl = 'https://ipfs.io/ipfs/';

      const ipfsRegex = /^ipfs:\/\/.*/;
      if (ipfsRegex.test(tokenUri)) {
        const jsonRegex = /\.json$/;
        if (!jsonRegex.test(tokenUri)) {
          try {
            const { data } = await firstValueFrom(
              this.httpService.get(
                `${ipfsUrl}${tokenUri.replace('ipfs://', '')}.json`,
              ),
            );

            return data;
          } catch (error) {
            const { data } = await firstValueFrom(
              this.httpService.get(
                `${ipfsUrl}${tokenUri.replace('ipfs://', '')}`,
              ),
            );
            return data;
          }
        }
        const { data } = await firstValueFrom(
          this.httpService.get(`${ipfsUrl}${tokenUri.replace('ipfs://', '')}`),
        );
        return data;
      }
      const { data } = await firstValueFrom(
        this.httpService.get(`${tokenUri}`),
      );

      return data;
    } catch (error) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.get(`${tokenUri}.json`),
        );
        return data;
      } catch (error) {
        throw new NotFoundException(`Can't find metadata`, {
          cause: new Error(),
          description: 'Find IPFS Metadata Error',
        });
      }
    }
  }

  async notUseIPFS(tokenUri: string) {
    try {
      if (tokenUri.length === 0)
        throw new NotImplementedException('Token URI is empty', {
          cause: new Error(),
          description: 'Not Use IPFS Error',
        });
      const { data } = await firstValueFrom(
        this.httpService.get(tokenUri).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new NotFoundException(`Can't get data from tokenUri`, {
              cause: new Error(),
              description: 'Not Use IPFS Error',
            });
          }),
        ),
      );

      if (!data.name || !data.description || !data.image)
        throw new NotFoundException('No Data From URI', {
          cause: new Error(),
          description: 'Not Use IPFS Error',
        });
      return {
        name: data.name,
        description: data.description,
        image: data.image,
      };
    } catch (error) {
      throw error;
    }
  }

  async getERC721Info({
    eoa,
    ca,
    tokenId,
  }: {
    eoa: string;
    ca: string;
    tokenId: string;
  }) {
    try {
      const abi = ERC721_ABI;
      const contract = new Contract(ca, abi, this.provider);
      const sample = {
        ca,
        tokenId,
        owner: 'unknown',
        supply: 0,
        symbol: 'unknown',
        collectionName: 'unknown',
        tokenUri: 'unkown',
      };

      try {
        sample.owner = await contract.ownerOf(tokenId);
      } catch (error) {
        this.logger.error(`${ca} is not have  ownerOf Func`);
      }

      // if (sample.owner !== eoa) {
      //   throw new Error('This is not you own');
      // }

      try {
        sample.supply = Number(await contract.totalSupply());
      } catch (error) {
        this.logger.error(`${ca} is not have totalSupply Func`);
      }

      try {
        sample.symbol = await contract.symbol();
      } catch (error) {
        this.logger.error(`${ca} is not have symbol Func`);
      }

      try {
        sample.collectionName = await contract.name();
      } catch (error) {
        this.logger.error(`${ca} is not have name Func`);
      }

      try {
        sample.tokenUri = await contract.tokenURI(tokenId);
      } catch (error) {
        this.logger.error(`${ca} is not have tokenURI Fun`);
      }

      if (sample.tokenUri.includes('ipfs')) {
        const { name, description, image } = await this.isUseIPFS(
          sample.tokenUri,
        );

        const ipfsRegex = /^ipfs:\/\/.*/;

        if (ipfsRegex.test(image)) {
          const ipfsUrl = 'https://ipfs.io/ipfs/';
          const realImage = `${ipfsUrl}${image.replace('ipfs://', '')}`;
          return {
            ...sample,
            nftName: name,
            image: realImage,
            description,
          };
        }

        return {
          ...sample,
          nftName: name,
          image,
          description,
        };
      }

      const { name, description, image } = await this.notUseIPFS(
        sample.tokenUri,
      );
      return {
        ...sample,
        nftName: name,
        image,
        description,
      };
    } catch (error) {
      throw error;
    }
  }

  async getERC1155Info({ ca, tokenId }: { ca: string; tokenId: string }) {
    try {
      const abi = ERC1155_ABI;
      const contract = new Contract(ca, abi, this.provider);
      const uri = await contract.uri(tokenId);

      if (uri === '') {
        throw new NotFoundException('Metadata not found', {
          cause: new Error(),
          description: 'Get ERC 1155 Metadata Error',
        });
      }

      if (uri.includes('testnets-api.opensea.io')) {
        const { name, description, image } = await this.getOpenSeaMetadata(
          uri,
          tokenId,
        );
        return { name, description, image };
      }

      const ipfsRegex = /^ipfs:\/\/.*/;
      if (ipfsRegex.test(uri)) {
        const { name, description, image } = await this.isUseIPFS(uri);

        if (ipfsRegex.test(image)) {
          const ipfsUrl = 'https://ipfs.io/ipfs/';
          const realImage = `${ipfsUrl}${image.replace('ipfs://', '')}`;
          return { name, description, image: realImage };
        }
        return { name, description, image };
      }

      const { data } = await firstValueFrom(
        this.httpService.get(uri).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new NotFoundException('Unable to get Metadata', {
              cause: new Error(),
              description: 'Get ERC 1155 Metadata Error',
            });
          }),
        ),
      );

      if (!data) {
        throw new NotFoundException('Not Found Data', {
          cause: new Error(),
          description: 'Get ERC 1155 Metadata Error',
        });
      }

      const { name, image, description } = data;
      return { name, image, description };
    } catch (error) {
      throw error;
    }
  }

  async getOpenSeaMetadata(tokenUri: string, tokenId: string) {
    const openseaApi = tokenUri.split('0x{id}')[0] + tokenId;

    const { data } = await firstValueFrom(
      this.httpService.get(openseaApi).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response?.data);
          throw new NotFoundException('Failed to get OpenSea Metadata', {
            cause: new Error(),
            description: 'OpenSea API Error',
          });
        }),
      ),
    );

    const { name, description, image } = data;
    return { name, description, image };
  }
}
