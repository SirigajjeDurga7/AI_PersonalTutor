from pymongo import MongoClient

uri = "mongodb+srv://karnatisharvani05:Password123%40AI@cluster0.h5hvalh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

client = MongoClient(uri, tls=True)

print("Connecting...")
print(client.admin.command("ping"))