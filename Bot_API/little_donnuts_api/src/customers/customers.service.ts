import { Injectable, Logger, BadRequestException, InternalServerErrorException, UnauthorizedException, NotFoundException} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor (
    private readonly dbService: PrismaService
  ) {}

  private readonly logger = new Logger(CustomersService.name)
  
  async create(createCustomerDto: CreateCustomerDto) {
    try {
      const { name, numberPhone} = createCustomerDto;

      const customerExist = await this.dbService.customer.findFirst({
        where: {
          fullName: name.toUpperCase()
        },
        include: {
          phone: true
        }
      });

      if (customerExist){
        const existingCustomer = customerExist.phone.find(
          (phone) => phone.phone === numberPhone
        )

        if (existingCustomer){
          throw new BadRequestException('Custom Already Exists');
        }

        await this.dbService.numberPhone.create({
          data: {
            phone: numberPhone,
            customerId: customerExist.id
          }
        });

        return customerExist;
      }

      if (name == null || numberPhone == null) {
        throw new BadRequestException("Fields can not be null")
      }

      const customer = await this.dbService.customer.create({
        data: {
          fullName: name,
          phone: {
            create: {phone: numberPhone}
          }
        }
      });

      return customer;
    } catch (error: any) {
      this.logger.error(`Error creating a customer: ${error.message}`);
      throw new InternalServerErrorException("Error creating a customer")
    }
  }

  async findAll() {
    try {
      const customers = await this.dbService.customer.findMany({
        include: {
          phone: true,
        }
      });

      if (!customers || customers.length === 0) {
        throw new NotFoundException('No customers found');
      }

      return customers;
    } catch (errors: any) {
      this.logger.error(`Error fetching all customers: ${errors.message}`)
      throw new InternalServerErrorException('Error fetching all customers1')
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} customer`;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    try {
      const { name, numberPhone} = updateCustomerDto;

      if (!name && !numberPhone) {
        throw new BadRequestException('No fields to update');
      }

      const customer = await this.dbService.customer.findUnique({
        where: {
          id
        }
      });

      if (!customer) {
        throw new NotFoundException
      }

      const updatedCustomer = await this.dbService.customer.update({
        where: {
          id
        },
        data: {
          fullName: name || customer.fullName,
          phone: {
            create: numberPhone ? {
              phone: numberPhone
            } : undefined
          }
        }
      });

      return updateCustomerDto;
    } catch (error: any) {
      this.logger.error(`Error updating customer: ${error.message}`);
      throw new InternalServerErrorException('Error updating customer')
    }
  }

  remove(id: number) {
    return `This action removes a #${id} customer`;
  }
}
