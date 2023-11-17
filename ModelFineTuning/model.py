import os
from dotenv import load_dotenv
from collections import defaultdict
import tiktoken
import numpy as np
import json
from openai import OpenAI
# Preparing our enviroment
encoding = tiktoken.get_encoding("cl100k_base")

load_dotenv()

OPENAI_API_KEY = os.getenv("OPEN_AI_API_KEY")


#openai.api_key = OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_MESSAGE_BOT = os.getenv("SYSTEM_MESSAGE_BOT")

# Apply the necessarry format
messages = []
def format(list_msg, sys_msg=None):
    if sys_msg:
        messages.append({
            "role": "system",
            "content": sys_msg
        })
    
    for msg in list_msg:
        parts = msg.split(': ', maxsplit=1)

        if len(parts) < 2:
            continue
        role = parts[0].strip()
        content = parts[1].strip()

        message = {
            "role": role,
            "content": content
        }

        messages.append(message)

    dict_final = {
        "messages": messages
    }

    return dict_final

dataset = []

format_list = []

#Prepare the data
with open('dataset.txt') as f:
    text = [line for line in f]

    for line in text:
        if line == '-\n':
            formatted_text = format(list_msg=format_list, sys_msg=SYSTEM_MESSAGE_BOT)

            dataset.append(formatted_text)
            format_list = []
            continue
        format_list.append(line)


# Validate format, erros and price
format_errors = defaultdict(int)

print("Lets go find errors: ")
for ex in dataset:
    if not isinstance(ex, dict):
        format_errors["data_type"] += 1
        continue
    messages = ex.get("messages", None)

    if not messages:
        format_errors["missing_messages_list"] += 1
        continue

    for message in messages:
        if "role" not in message or "content" not in message:
            format_errors["message_missing_key"] += 1
        if any(k not in ("role", "content", "name") for k in message):
            format_errors["message_unrecognized_key"] += 1
        if message.get("role", None) not in ("system", "user", "assistant"):
            format_errors["unrecognized_role"] += 1
        
        content = message.get("content", None)
        if not content or not isinstance(content, str):
            format_errors["missing_content"] += 1
    
    if not any(message.get("role", None) == "assistant" for message in messages):
        format_errors["example_missing_assistant_messaeg"] += 1

if format_errors:
    print("Found errors: ")
    for k, v in format_errors.items():
        print(f"{k}: {v}")
else:
    print("No errors found")



print("Lets find the tokens: ")

def num_tokens_from_messages(messages, tokens_per_message=3, tokens_per_name=1):
    num_tokens = 0
    for message in messages:
        num_tokens += tokens_per_message
        for key, value in message.items():
            num_tokens += len(encoding.encode(value))
            if key == "name":
                num_tokens += tokens_per_name
    num_tokens += 3
    return num_tokens

def num_assistant_tokens_from_messages(messages):
    num_tokens = 0
    for message in messages:
        if message["role"] == "assistant":
            num_tokens += len(encoding.encode(message["content"]))
    return num_tokens

def print_distribution(values, name):
    print(f"\n#### Distribución de {name}:")
    print(f"min / max: {min(values)}, {max(values)}")
    print(f"media / mediana: {np.mean(values)}, {np.median(values)}")
    print(f"p5 / p95: {np.quantile(values, 0.1)}, {np.quantile(values, 0.9)}")

n_missing_system = 0
n_missing_user = 0
n_messages = []
convo_lens = []
assistant_message_lens = []

for ex in dataset:
    messages = ex["messages"]
    if not any(message["role"] == "system" for message in messages):
        n_missing_system += 1
    if not any(message["role"] == "user" for message in messages):
        n_missing_user += 1
    n_messages.append(len(messages))
    convo_lens.append(num_tokens_from_messages(messages))
    assistant_message_lens.append(num_assistant_tokens_from_messages(messages))

print("Num de ejemplos sin el system message:", n_missing_system)
print("Num de ejemplos sin el user message:", n_missing_user)
print_distribution(n_messages, "num_mensajes_por_ejemplo")
print_distribution(convo_lens, "num_total_tokens_por_ejemplo")
print_distribution(assistant_message_lens, "num_assistant_tokens_por_ejemplo")
n_too_long = sum(l > 4096 for l in convo_lens)
print(f"\n{n_too_long} ejemplos que excedan el límite de tokenes de 4096, ellos serán truncados durante el fine-tuning")
MAX_TOKENS_PER_EXAMPLE = 4096

MIN_TARGET_EXAMPLES = 100
MAX_TARGET_EXAMPLES = 25000
TARGET_EPOCHS = 3
MIN_EPOCHS = 1
MAX_EPOCHS = 3

n_epochs = TARGET_EPOCHS
n_train_examples = len(dataset)
if n_train_examples * TARGET_EPOCHS < MIN_TARGET_EXAMPLES:
    n_epochs = min(MAX_EPOCHS, MIN_TARGET_EXAMPLES // n_train_examples)
elif n_train_examples * TARGET_EPOCHS > MAX_TARGET_EXAMPLES:
    n_epochs = max(MIN_EPOCHS, MAX_TARGET_EXAMPLES // n_train_examples)

n_billing_tokens_in_dataset = sum(min(MAX_TOKENS_PER_EXAMPLE, length) for length in convo_lens)
print(f"El conjunto de datos tiene ~{n_billing_tokens_in_dataset} tokens que serán cargados durante el entrenamiento")
print(f"Por defecto, entrenarás para {n_epochs} epochs en este conjunto de datos")
print(f"Por defecto, serás cargado con ~{n_epochs * n_billing_tokens_in_dataset} tokens")

# here its whats we want to check :)
print(f"El costo total de entrenamiento seria de {((n_epochs * n_billing_tokens_in_dataset) * 0.008)/1000}$")


def save_to_jsonl(dataset, file_path):
    with open(file_path, 'w') as file:
        for ejemplo in dataset:
            json_line = json.dumps(ejemplo)
            file.write(json_line + '\n')

save_to_jsonl(dataset, 'little_donuts_train_full.jsonl')


# upload file
# response_file = client.files.create(
#     file=open('little_donuts_train_full.jsonl', 'rb'),
#     purpose='fine-tune'
# )

# print(response_file)

# create a fine tuning model

# response_model = client.fine_tuning.jobs.create(
#     training_file='file-CVqATiLysXWevcHkKK73eMmx',
#     model="gpt-3.5-turbo"
# )
# print(response_model)

# use a fine tuning model

response_using_model = client.chat.completions.create(
    model='ft:gpt-3.5-turbo-0613:personal::8KCwxFM4',
    messages=[
        {
            "role": "system", "content": SYSTEM_MESSAGE_BOT
        },
        {
            "role": "assistant",
            "content": "Hola, me gustaria saber que toppings puedo agregarle?"
        }
    ]
)

print(response_using_model.choices[0])