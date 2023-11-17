import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class LoginAuthDto {
    @ApiProperty({
        description: 'The username of the user',
        type: String,
    })
    @IsNotEmpty()
    @IsString()
    username: string

    @ApiProperty({
        description: 'The password of the user',
        type: String,
    })
    @IsNotEmpty()
    @IsString()
    password: string
}
