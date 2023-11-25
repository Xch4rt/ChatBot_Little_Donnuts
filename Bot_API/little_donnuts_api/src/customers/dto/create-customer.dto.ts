import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateCustomerDto {
    @ApiProperty({
        description: "Name of the customer"
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: "Number phone of the customer"
    })
    @IsString()
    @IsNotEmpty()
    numberPhone: string;
}

