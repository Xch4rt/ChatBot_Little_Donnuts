import { Injectable, Logger, BadRequestException, InternalServerErrorException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto copy';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt  from  'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: PrismaService
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async create(createAuthDto: CreateAuthDto) {
    try {
      const {fullName, password, username} = createAuthDto;

      const userExist = await this.dbService.user.findFirst({
        where: {
          username: username,
          isActive: true
        }
      });

      if (userExist) {
        throw new BadRequestException('User already exist');
      }

      if (fullName == "" || password == "" || username ==""){
        throw new BadRequestException("Not valid format for the fields")
      }

      const passwordEncrypted = await this.encryptPassword(password);

      const createUser = await this.dbService.user.create({
        data: {
          fullName: fullName,
          username: password,
          password: passwordEncrypted
        }
      });

      this.logger.log(`Created user with ID: ${createUser.id}`);
      return createUser;
    } catch (error: any) {
      this.logger.error(`Error creating an user: ${error.message}`);
      throw new InternalServerErrorException("Error creating an user")
    }
  }

  private async encryptPassword (password: string): Promise<string> {
    const hash = await bcrypt.hash(password, process.env.SALT);
    return hash;
  }

  async login (loginAuthDto: LoginAuthDto) {
    try {
      const { username, password } = loginAuthDto;
      const userExist = await this.dbService.user.findFirst({
        where: {
          username: username,
          isActive: true
        }
      });

      if (!userExist) {
        this.logger.error("User not found");
        throw new NotFoundException("The user does not exist!")
      }

      const passwordMatch = await this.validatePassword(userExist.password);

      if (!passwordMatch) {
        this.logger.error("Wrong credentials");
        throw new UnauthorizedException("Wrong Credentials");
      }

      return userExist;
    } catch (error: any) {
      this.logger.error("There has been an error with the request");
      throw new InternalServerErrorException("Error with the request");
    }
  }

  private async validatePassword(password: string) : Promise<boolean> {
    return await bcrypt.compare(password, process.env.SALT);
  }

  async findAll() {
    try {
      const users = await this.dbService.user.findMany(
        {
          where: {
            isActive: true
          }
        }
      );
      if (!this.findAll) {
        this.logger.error("Not users founded");
        throw new NotFoundException("Not users founded");
      }
      this.logger.log("Fetched all users");

      return users;
    } catch (error: any) {
      this.logger.error(`Error fetching all users: ${error.message}`);
      throw new InternalServerErrorException('Error fetching users');
    }
  } 

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
